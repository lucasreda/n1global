import twilio from 'twilio';
import { db } from './db';
import { voiceSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class TwilioProvisioningService {
  private client: twilio.Twilio;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not found. Please configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Provision a phone number for an operation
   */
  async provisionPhoneNumber(operationId: string, countryCode: string = 'US'): Promise<string> {
    let purchasedNumber = null;
    
    try {
      console.log(`📞 Provisioning Twilio phone number for operation ${operationId}...`);

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
          availableNumbers = await this.client.availablePhoneNumbers(country)
            .local
            .list({ 
              voiceEnabled: true,
              smsEnabled: true,
              limit: 10 
            });

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
      const phoneNumber = availableNumbers[0].phoneNumber;
      console.log(`📱 Purchasing number: ${phoneNumber} from ${usedCountry}`);

      purchasedNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber,
        voiceUrl: `https://${webhookDomain}/api/voice/test-call-handler?operationId=${operationId}&callType=sales`,
        voiceMethod: 'POST',
        voiceApplicationSid: '', // Ensure no TwiML App overrides our URL
        statusCallback: `https://${webhookDomain}/api/voice/call-status`,
        statusCallbackMethod: 'POST',
        friendlyName: `Voice Support - Operation ${operationId.substring(0, 8)}`
      });

      console.log(`✅ Successfully provisioned number: ${purchasedNumber.phoneNumber} (${usedCountry}) for operation ${operationId}`);

      // Update voice settings with the new phone number (transactional)
      try {
        await this.updateVoiceSettingsWithNumber(operationId, purchasedNumber.phoneNumber, purchasedNumber.sid);
      } catch (dbError) {
        // Compensation: Release the purchased number if DB update fails
        console.error(`❌ Database update failed, releasing purchased number ${purchasedNumber.phoneNumber}...`);
        try {
          await this.client.incomingPhoneNumbers(purchasedNumber.sid).remove();
          console.log(`🔄 Successfully released orphaned number ${purchasedNumber.phoneNumber}`);
        } catch (releaseError) {
          console.error(`⚠️ Failed to release orphaned number ${purchasedNumber.phoneNumber}:`, releaseError);
        }
        throw dbError;
      }

      return purchasedNumber.phoneNumber;
    } catch (error) {
      console.error(`❌ Error provisioning phone number for operation ${operationId}:`, error);
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

      if (!settings?.twilioPhoneNumber) {
        console.log(`ℹ️ No phone number found for operation ${operationId}`);
        return;
      }

      // Find the phone number SID
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        phoneNumber: settings.twilioPhoneNumber
      });

      if (phoneNumbers.length === 0) {
        console.log(`⚠️ Phone number ${settings.twilioPhoneNumber} not found in Twilio account`);
        return;
      }

      // Update the webhook URL to use Sofia's endpoint and clear any TwiML App
      await this.client.incomingPhoneNumbers(phoneNumbers[0].sid).update({
        voiceUrl: `https://${webhookDomain}/api/voice/test-call-handler?operationId=${operationId}&callType=sales`,
        voiceMethod: 'POST',
        voiceApplicationSid: '', // Clear any TwiML App that could override voiceUrl
        statusCallback: `https://${webhookDomain}/api/voice/call-status`,
        statusCallbackMethod: 'POST'
      });

      console.log(`✅ Successfully updated webhook config for ${settings.twilioPhoneNumber} to use Sofia endpoint`);
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

      if (!settings?.twilioPhoneNumber) {
        console.log(`ℹ️ No phone number found for operation ${operationId}`);
        return;
      }

      console.log(`🗑️ Releasing phone number ${settings.twilioPhoneNumber} for operation ${operationId}...`);

      // Find the phone number SID
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        phoneNumber: settings.twilioPhoneNumber
      });

      if (phoneNumbers.length === 0) {
        console.log(`⚠️ Phone number ${settings.twilioPhoneNumber} not found in Twilio account`);
        return;
      }

      // Release the phone number
      await this.client.incomingPhoneNumbers(phoneNumbers[0].sid).remove();

      // Clear the phone number from voice settings
      await db
        .update(voiceSettings)
        .set({ 
          twilioPhoneNumber: null,
          updatedAt: new Date()
        })
        .where(eq(voiceSettings.operationId, operationId));

      console.log(`✅ Successfully released phone number ${settings.twilioPhoneNumber} for operation ${operationId}`);
    } catch (error) {
      console.error(`❌ Error releasing phone number for operation ${operationId}:`, error);
      throw error;
    }
  }

  /**
   * Update voice settings with provisioned phone number
   */
  private async updateVoiceSettingsWithNumber(operationId: string, phoneNumber: string, twilioSid?: string): Promise<void> {
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
            twilioPhoneNumber: phoneNumber,
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
            twilioPhoneNumber: phoneNumber,
            welcomeMessage: 'Olá! Como posso ajudá-lo hoje?',
            operatingHours: {
              monday: { enabled: true, start: '09:00', end: '18:00' },
              tuesday: { enabled: true, start: '09:00', end: '18:00' },
              wednesday: { enabled: true, start: '09:00', end: '18:00' },
              thursday: { enabled: true, start: '09:00', end: '18:00' },
              friday: { enabled: true, start: '09:00', end: '18:00' },
              saturday: { enabled: false, start: '09:00', end: '18:00' },
              sunday: { enabled: false, start: '09:00', end: '18:00' },
              timezone: 'America/Sao_Paulo'
            },
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
      const phoneNumbers = await this.client.incomingPhoneNumbers.list({
        phoneNumber
      });

      if (phoneNumbers.length === 0) {
        return null;
      }

      return phoneNumbers[0];
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
      return await this.client.incomingPhoneNumbers.list();
    } catch (error) {
      console.error('❌ Error listing phone numbers:', error);
      throw error;
    }
  }
}

export const twilioProvisioningService = new TwilioProvisioningService();