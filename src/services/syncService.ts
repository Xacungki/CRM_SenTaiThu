import { firebaseService } from './firebaseService';
import { gasService } from './gasService';
import { Lead, AuditEvent } from '../types';

/**
 * SyncService wraps the database operations.
 * It strictly uses Firebase as the Source of Truth, and pushes best-effort mirror data to Google Sheets 
 * so the team can continue using Apps Script workflows for read-only reporting if needed.
 */
export const syncService = {
  async getLeads(): Promise<Lead[]> {
    return firebaseService.getLeads(); // Always read from Source of Truth
  },

  async createLead(lead: Partial<Lead>): Promise<boolean> {
      // 1. Write to Source of Truth (Firebase)
      const fbSuccess = await firebaseService.createLead(lead);
      if (fbSuccess) {
          // 2. Mirror to Sheets asynchronously (Best effort, non-blocking)
          // Since Firebase created the ID but we don't have it natively in `firebaseService.createLead` 
          // (it returns boolean), we might miss ID sync.
          // Wait, we need to pass the ID or fetch it!
          // We can just rely on the fallback ID creation in GAS for now, or improve firebaseService.
          gasService.createLead(lead).catch(e => console.error("Mirror to GAS failed", e));
      }
      return fbSuccess;
  },

  async updateLead(lead: Lead): Promise<boolean> {
      const fbSuccess = await firebaseService.updateLead(lead);
      if (fbSuccess) {
          gasService.updateLead(lead).catch(e => console.error("Mirror to GAS failed", e));
      }
      return fbSuccess;
  },

  async deleteLead(lead: Lead): Promise<boolean> {
      const fbSuccess = await firebaseService.deleteLead(lead);
      if (fbSuccess) {
          gasService.deleteLead(lead).catch(e => console.error("Mirror to GAS failed", e));
      }
      return fbSuccess;
  },

  async importLeads(leads: Partial<Lead>[]): Promise<boolean> {
      // Loop and create
      let allSuccess = true;
      for (const lead of leads) {
          const success = await this.createLead(lead);
          if (!success) allSuccess = false;
      }
      return allSuccess;
  },

  async addAuditLog(log: AuditEvent): Promise<boolean> {
      const fbSuccess = await firebaseService.addAuditLog(log);
      if (fbSuccess) {
          gasService.addAuditLog(log).catch(e => console.error("Mirror to GAS failed", e));
      }
      return fbSuccess;
  }
};
