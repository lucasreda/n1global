import Telnyx from 'telnyx';
import { db } from './db';
import { voiceSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class TelnyxProvisioningService {
  private client: Telnyx;

  constructor() {
    const apiKey = process.env.TELNYX_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ TELNYX_API_KEY not configured - service will not function properly');
      this.client = null as any; // Will be handled gracefully in methods
    } else {
      this.client = new Telnyx(apiKey);
    }
  }

  /**
   * Provision a phone number for an operation
   */
  async provisionPhoneNumber(operationId: string, countryCode: string = 'US'): Promise<string> {
    // Check if client is properly configured
    if (!this.client) {
      throw new Error('Telnyx API not configured. Please set TELNYX_API_KEY environment variable.');
    }
    
    let purchasedNumber = null;
    
    try {
      console.log(`📞 Provisioning Telnyx phone number for operation ${operationId}...`);

      // Validate webhook domain
      const webhookDomain = process.env.REPLIT_DEV_DOMAIN;
      if (!webhookDomain) {
        throw new Error('REPLIT_DEV_DOMAIN environment variable is not set');
      }

      // Try multiple countries in order of preference
      const countriesToTry = [countryCode, 'US', 'CA', 'GB'];
      let availableNumbers: any[] = [];
      let usedCountry = countryCode;

      for (const country of countriesToTry) {
        console.log(`🔍 Searching for available numbers in ${country}...`);
        
        try {
          const response = await this.client.availablePhoneNumbers.list({
            filter: { 
              country_code: country,
              features: ['voice', 'sms'],
              limit: 10 
            } 
          });

          availableNumbers = response.data || [];

          if (availableNumbers.length > 0) {
            usedCountry = country;
            console.log(`✅ Found ${availableNumbers.length} available numbers in ${country}`);
            break;
          } else {
            console.log(`ℹ️ No available numbers in ${country}, trying next...`);
          }
        } catch (error) {
          console.log(`⚠️ Error checking ${country}: ${(error as Error).message}`);
          continue;
        }
      }

      if (availableNumbers.length === 0) {
        throw new Error(`No available phone numbers found in any supported country (tried: ${countriesToTry.join(', ')})`);
      }

      // Purchase the first available number
      const phoneNumber = availableNumbers[0].phone_number;
      console.log(`📱 Purchasing number: ${phoneNumber} from ${usedCountry}`);

      // Purchase number via Telnyx Number Orders API
      const orderResponse = await this.client.numberOrders.create({
        phone_numbers: [{ phone_number: phoneNumber }]
      });

      console.log(`📋 Number order created: ${orderResponse.data?.id || 'unknown'}`);

      // Wait for number to be active and configure it
      await this.waitForNumberActive(phoneNumber);
      
      // Configure the number with webhooks
      await this.configurePhoneNumber(phoneNumber, operationId, webhookDomain);

      console.log(`✅ Successfully provisioned number: ${phoneNumber} (${usedCountry}) for operation ${operationId}`);

      // Update voice settings with the new phone number (transactional)
      try {
        await this.updateVoiceSettingsWithNumber(operationId, phoneNumber);
      } catch (dbError) {
        // Compensation: Release the purchased number if DB update fails
        console.error(`❌ Database update failed, attempting to release purchased number ${phoneNumber}...`);
        try {
          await this.releasePhoneNumber(operationId);
          console.log(`🔄 Successfully released orphaned number ${phoneNumber}`);
        } catch (releaseError) {
          console.error(`⚠️ Failed to release orphaned number ${phoneNumber}:`, releaseError);
        }
        throw dbError;
      }

      return phoneNumber;
    } catch (error) {
      console.error(`❌ Error provisioning phone number for operation ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Wait for a purchased number to become active
   */
  private async waitForNumberActive(phoneNumber: string, maxAttempts: number = 30): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const numbers = await this.client.phoneNumbers.list({
          filter: { phone_number: phoneNumber }
        });

        if (numbers.data && numbers.data.length > 0) {
          const number = numbers.data[0];
          if (number.status === 'active') {
            console.log(`✅ Number ${phoneNumber} is now active`);
            return;
          }
          console.log(`⏳ Number ${phoneNumber} status: ${number.status}, waiting... (${attempt}/${maxAttempts})`);
        }

        // Wait 2 seconds before next attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`⚠️ Error checking number status (attempt ${attempt}): ${(error as Error).message}`);
        if (attempt === maxAttempts) throw error;
      }
    }
    
    throw new Error(`Number ${phoneNumber} did not become active within ${maxAttempts * 2} seconds`);
  }

  /**
   * Configure phone number with webhooks via Call Control Application
   */
  private async configurePhoneNumber(phoneNumber: string, operationId: string, webhookDomain: string): Promise<void> {
    try {
      // Create a Call Control Application for this operation
      const app = await this.client.callControlApplications.create({
        application_name: `Sofia Voice - ${operationId.substring(0, 8)}`,
        webhook_url: `https://${webhookDomain}/api/voice/telnyx-incoming-call?operationId=${operationId}&callType=sales`,
        webhook_failover_url: `https://${webhookDomain}/api/voice/telnyx-incoming-call?operationId=${operationId}&callType=sales`,
        webhook_api_version: "2"
      });

      // Get the phone number resource
      const numbers = await this.client.phoneNumbers.list({
        filter: { phone_number: phoneNumber }
      });

      if (!numbers.data || numbers.data.length === 0) {
        throw new Error(`Phone number ${phoneNumber} not found in account`);
      }

      const numberResource = numbers.data[0];
      
      // Associate the phone number with the Call Control Application
      await this.client.phoneNumbers.update(numberResource.id!, {
        connection_id: app.data!.id
      });

      console.log(`✅ Successfully configured webhooks for ${phoneNumber} with app ${app.data!.id}`);
    } catch (error) {
      console.error(`❌ Error configuring phone number ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * Update existing phone number webhook configuration
   */
  async updatePhoneNumberConfig(operationId: string): Promise<void> {
    try {
      console.log(`🔧 Updating phone number webhook config for operation ${operationId}...`);

      // Validate webhook domain
      const webhookDomain = process.env.REPLIT_DEV_DOMAIN;
      if (!webhookDomain) {
        throw new Error('REPLIT_DEV_DOMAIN environment variable is not set');
      }

      // Get the current phone number for this operation
      const [settings] = await db
        .select()
        .from(voiceSettings)
        .where(eq(voiceSettings.operationId, operationId))
        .limit(1);

      if (!settings?.telnyxPhoneNumber) {
        console.log(`ℹ️ No phone number found for operation ${operationId}`);
        return;
      }

      // Find the phone number in Telnyx
      const numbers = await this.client.phoneNumbers.list({
        filter: { phone_number: settings.telnyxPhoneNumber }
      });

      if (!numbers.data || numbers.data.length === 0) {
        console.log(`⚠️ Phone number ${settings.telnyxPhoneNumber} not found in Telnyx account`);
        return;
      }

      const numberResource = numbers.data[0];

      // Create new Call Control Application with updated webhook URL
      const app = await this.client.callControlApplications.create({
        application_name: `Sofia Voice - ${operationId.substring(0, 8)} - Updated`,
        webhook_url: `https://${webhookDomain}/api/voice/telnyx-incoming-call?operationId=${operationId}&callType=sales`,
        webhook_failover_url: `https://${webhookDomain}/api/voice/telnyx-incoming-call?operationId=${operationId}&callType=sales`,
        webhook_api_version: "2"
      });

      // Update phone number to use new application
      await this.client.phoneNumbers.update(numberResource.id!, {
        connection_id: app.data!.id
      });

      console.log(`✅ Successfully updated webhook config for ${settings.telnyxPhoneNumber} to use Sofia endpoint`);
    } catch (error) {
      console.error(`❌ Error updating phone number config for operation ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Release a phone number for an operation
   */
  async releasePhoneNumber(operationId: string): Promise<void> {
    try {
      // Get the current phone number for this operation
      const [settings] = await db
        .select()
        .from(voiceSettings)
        .where(eq(voiceSettings.operationId, operationId))
        .limit(1);

      if (!settings?.telnyxPhoneNumber) {
        console.log(`ℹ️ No phone number found for operation ${operationId}`);
        return;
      }

      console.log(`🗑️ Releasing phone number ${settings.telnyxPhoneNumber} for operation ${operationId}...`);

      // Find the phone number in Telnyx
      const numbers = await this.client.phoneNumbers.list({
        filter: { phone_number: settings.telnyxPhoneNumber }
      });

      if (!numbers.data || numbers.data.length === 0) {
        console.log(`⚠️ Phone number ${settings.telnyxPhoneNumber} not found in Telnyx account`);
        return;
      }

      const numberResource = numbers.data[0];

      // Release the phone number using proper Telnyx method
      await this.client.phoneNumbers.delete(numberResource.id!);

      // Clear the phone number from voice settings
      await db
        .update(voiceSettings)
        .set({ 
          telnyxPhoneNumber: null,
          updatedAt: new Date()
        })
        .where(eq(voiceSettings.operationId, operationId));

      console.log(`✅ Successfully released phone number ${settings.telnyxPhoneNumber} for operation ${operationId}`);
    } catch (error) {
      console.error(`❌ Error releasing phone number for operation ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Update voice settings with provisioned phone number
   */
  private async updateVoiceSettingsWithNumber(operationId: string, phoneNumber: string): Promise<void> {
    try {
      // Check if voice settings record exists
      const [existingRecord] = await db
        .select({ id: voiceSettings.id })
        .from(voiceSettings)
        .where(eq(voiceSettings.operationId, operationId))
        .limit(1);

      if (existingRecord) {
        // Update existing record
        await db
          .update(voiceSettings)
          .set({ 
            telnyxPhoneNumber: phoneNumber,
            updatedAt: new Date()
          })
          .where(eq(voiceSettings.operationId, operationId));
      } else {
        // Create new record
        await db
          .insert(voiceSettings)
          .values({
            operationId,
            isActive: false,
            telnyxPhoneNumber: phoneNumber,
            outOfHoursMessage: 'Desculpe, nosso atendimento está fechado no momento.',
            outOfHoursAction: 'voicemail'
          });
      }
    } catch (error) {
      console.error(`❌ Error updating voice settings for operation ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Get phone number information
   */
  async getPhoneNumberInfo(phoneNumber: string): Promise<any> {
    try {
      const numbers = await this.client.phoneNumbers.list({
        filter: { phone_number: phoneNumber }
      });

      if (!numbers.data || numbers.data.length === 0) {
        return null;
      }

      return numbers.data[0];
    } catch (error) {
      console.error(`❌ Error getting phone number info for ${phoneNumber}:`, error);
      throw error;
    }
  }

  /**
   * List all phone numbers for the account
   */
  async listPhoneNumbers(): Promise<any[]> {
    try {
      const response = await this.client.phoneNumbers.list();
      return response.data || [];
    } catch (error) {
      console.error('❌ Error listing phone numbers:', error);
      throw error;
    }
  }

  /**
   * Make an outbound call using Telnyx
   */
  async makeOutboundCall(fromNumber: string, toNumber: string, webhookUrl: string): Promise<any> {
    try {
      console.log(`📞 Making outbound call from ${fromNumber} to ${toNumber}`);
      console.log(`🔗 Using CONNECTION_ID: ${process.env.TELNYX_CONNECTION_ID}`);
      
      // Brazil caller ID compliance check
      const isBrazilDestination = toNumber.startsWith('+55');
      if (isBrazilDestination) {
        console.log(`🇧🇷 BRAZIL DESTINATION DETECTED - US DID may be rejected by Brazilian operators`);
        console.log(`⚠️  Consider using a Brazilian DID as caller_id for better call completion`);
      }

      const response = await this.client.calls.create({
        connection_id: process.env.TELNYX_CONNECTION_ID!,
        to: toNumber,
        from: fromNumber,
        webhook_url: webhookUrl,
        timeout_secs: 60, // Increased for international calls  
        time_limit_secs: 300,
        // Enhanced settings for international routing
        webhook_timeout_secs: 25,
        client_state: Buffer.from(JSON.stringify({
          callType: 'outbound-sales',
          destination: toNumber,
          timestamp: Date.now(),
          callerIdCompliance: isBrazilDestination ? 'brazil-restriction' : 'standard'
        })).toString('base64')
      });

      console.log(`✅ Call initiated with ID: ${response.data?.call_control_id || 'unknown'}`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ Error making outbound call:`, error);
      
      // Log specific error details for troubleshooting
      if (error.response?.data) {
        const errorData = error.response.data;
        console.error(`🔍 Telnyx Error Details:`, {
          status: error.response.status,
          errors: errorData.errors,
          meta: errorData.meta
        });
        
        // Check for common Brazil calling issues
        if (errorData.errors?.[0]?.code === 'D13') {
          console.error(`🚫 D13 Error: Dialed Number is not included in whitelisted countries`);
        } else if (errorData.errors?.[0]?.code === 'D35') {
          console.error(`🚫 D35 Error: Caller Origination Number is Invalid (CLI issue)`);
        } else if (error.response.status === 403) {
          console.error(`🚫 403 Forbidden: Rate limits, spend limits, or compliance restrictions`);
        }
      }
      
      throw error;
    }
  }
}

export const telnyxProvisioningService = new TelnyxProvisioningService();