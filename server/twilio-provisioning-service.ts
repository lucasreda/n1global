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
  async provisionPhoneNumber(operationId: string, countryCode: string = 'BR'): Promise<string> {
    try {
      console.log(`📞 Provisioning Twilio phone number for operation ${operationId}...`);

      // Search for available phone numbers
      const availableNumbers = await this.client.availablePhoneNumbers(countryCode)
        .local
        .list({ 
          voiceEnabled: true,
          smsEnabled: true,
          limit: 10 
        });

      if (availableNumbers.length === 0) {
        throw new Error(`No available phone numbers found for country ${countryCode}`);
      }

      // Purchase the first available number
      const phoneNumber = availableNumbers[0].phoneNumber;
      console.log(`📱 Found available number: ${phoneNumber}`);

      const purchasedNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber,
        voiceUrl: `${process.env.REPLIT_DEV_DOMAIN}/api/voice/incoming-call`,
        voiceMethod: 'POST',
        statusCallback: `${process.env.REPLIT_DEV_DOMAIN}/api/voice/call-status`,
        statusCallbackMethod: 'POST',
        friendlyName: `Voice Support - Operation ${operationId.substring(0, 8)}`
      });

      console.log(`✅ Successfully provisioned number: ${purchasedNumber.phoneNumber} for operation ${operationId}`);

      // Update voice settings with the new phone number
      await this.updateVoiceSettingsWithNumber(operationId, purchasedNumber.phoneNumber);

      return purchasedNumber.phoneNumber;
    } catch (error) {
      console.error(`❌ Error provisioning phone number for operation ${operationId}:`, error);
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
            allowedCallTypes: ['doubts', 'address_change', 'cancellation'],
            voiceInstructions: 'Você é Sofia, um assistente virtual empático da central de atendimento.',
            outOfHoursMessage: 'Desculpe, nosso atendimento está fechado no momento.',
            outOfHoursAction: 'voicemail',
            createdAt: new Date(),
            updatedAt: new Date()
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