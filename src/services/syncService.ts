import { gasService } from './gasService';
import { Lead, AuditEvent } from '../types';

/**
 * SyncService wraps the database operations.
 * It strictly uses Google Sheets (GAS) as the Source of Truth.
 */
export const syncService = {
  isOfflineMode(): boolean {
    return true; // We are fully offline/GAS now.
  },

  async getLeads(): Promise<Lead[]> {
    return gasService.getLeads().then(res => res?.leads || []);
  },

  async createLead(lead: Partial<Lead>): Promise<boolean> {
      const gasRes = await gasService.createLead(lead).catch(e => { console.error("GAS failed", e); return false; });
      return !!gasRes;
  },

  async updateLead(lead: Lead): Promise<boolean> {
      const gasRes = await gasService.updateLead(lead).catch(e => { console.error("GAS failed", e); return false; });
      return !!gasRes;
  },

  async deleteLead(lead: Lead): Promise<boolean> {
      const gasRes = await gasService.deleteLead(lead).catch(e => { console.error("GAS failed", e); return false; });
      return !!gasRes;
  },

  async importLeads(leads: Partial<Lead>[]): Promise<boolean> {
      const gasRes = await gasService.importLeads(leads).catch(e => { console.error("GAS failed", e); return false; });
      return !!gasRes;
  },

  async addAuditLog(log: AuditEvent): Promise<boolean> {
      const gasRes = await gasService.addAuditLog(log).catch(e => { console.error("GAS failed", e); return false; });
      return !!gasRes;
  }
};
