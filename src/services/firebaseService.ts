import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
  getDoc,
  increment
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Lead, AuditEvent, CRMUser } from '../types';
import { gasService } from './gasService';

export const firebaseService = {
  // Leads
  async getLeads(): Promise<Lead[]> {
    const q = query(collection(db, 'leads'));
    const snapshot = await getDocs(q);
    const leads = snapshot.docs
       .map(doc => ({ id: doc.id, ...doc.data() } as Lead))
       .filter(lead => !lead.isDeleted); // Filter out soft-deleted
       
    // Sort locally properly to prevent excluding documents that lack createdAt
    return leads.sort((a, b) => {
       const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
       const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
       return timeB - timeA;
    });
  },

  async createLead(lead: Partial<Lead>): Promise<boolean> {
    try {
      // Deduplication check
      if (lead.phone) {
        const dupQ = query(
          collection(db, 'leads'),
          where('phone', '==', lead.phone)
        );
        const dupSnap = await getDocs(dupQ);
        const duplicate = dupSnap.docs.map(d => d.data() as Lead).find(d => !d.isDeleted && d.branch === lead.branch);
        if (duplicate) {
           console.warn("Duplicate phone found in the same branch:", lead.phone);
           throw new Error("Duplicate phone in the same branch");
        }
      }

      const newRef = doc(collection(db, 'leads'));
      const payload = {
        ...lead,
        id: newRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        creatorEmail: auth.currentUser?.email || '',
        isDeleted: false,
        version: 1
      };
      await setDoc(newRef, payload);
      return true;
    } catch (e: any) {
      console.error(e);
      if (e.message.includes('Duplicate')) throw e; // Rethrow to show message in UI
      return false;
    }
  },

  async updateLead(lead: Lead): Promise<boolean> {
    try {
      if (!lead.id) return false;
      const ref = doc(db, 'leads', lead.id);
      const payload = { 
          ...lead, 
          updatedAt: serverTimestamp(),
          version: increment(1) as any
      };
      delete payload.id; // avoid saving id in document body
      await updateDoc(ref, payload);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  async deleteLead(lead: Lead): Promise<boolean> {
    try {
       if (!lead.id) return false;
       // Soft delete: update isDeleted flag instead of hard deleteDoc
       const ref = doc(db, 'leads', lead.id);
       await updateDoc(ref, { isDeleted: true, updatedAt: serverTimestamp() });
       return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditEvent[]> {
    const q = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as AuditEvent);
  },

  async addAuditLog(log: AuditEvent): Promise<boolean> {
     try {
       await addDoc(collection(db, 'auditLogs'), {
         ...log,
         userEmail: auth.currentUser?.email || '',
         createdAt: serverTimestamp()
       });
       return true;
     } catch (e) {
       console.error(e);
       return false;
     }
  },

  // Users / Roles
  async getUsers(): Promise<CRMUser[]> {
      const snapshot = await getDocs(collection(db, 'userRoles'));
      return snapshot.docs.map(doc => ({ id: doc.id, username: doc.data().email, ...doc.data() } as any));
  },
  
  async saveUser(user: CRMUser): Promise<boolean> {
      try {
          const pseudoEmail = user.username.includes('@') ? user.username : `${user.username}@sen-crm.local`;
          
          if ((user as any).id) {
               // Update
               await updateDoc(doc(db, 'userRoles', (user as any).id), {
                   email: pseudoEmail,
                   role: user.role,
                   branch: user.branch,
                   status: user.status
               });
          } else {
               // Create
               await addDoc(collection(db, 'userRoles'), {
                   email: pseudoEmail,
                   role: user.role,
                   branch: user.branch,
                   status: user.status
               });
          }
          return true;
      } catch (e) {
          console.error('Error saving user role', e);
          return false;
      }
  },

  async deleteUser(userId: string): Promise<boolean> {
      try {
         await deleteDoc(doc(db, 'userRoles', userId));
         return true;
      } catch (e) {
         console.error(e);
         return false;
      }
  },

  async migrateFromGas(): Promise<{success: boolean, count: number, error?: string}> {
      try {
         const data = await gasService.getAppData();
         if (!data || !data.leads) {
             return { success: false, count: 0, error: 'No data returned from Google Sheets' };
         }
         
         const leads = data.leads;
         const authUserEmail = auth.currentUser?.email || '';

         // Upload/Upsert leads
         let successCount = 0;
         for (const lead of leads) {
             // Basic fallback for requirement
             if (!lead.fullName) lead.fullName = 'Unknown';
             if (!lead.phone) lead.phone = '0000000000';
             
             // Try to find if this phone+branch already exists
             let existingLeadId: string | null = null;
             try {
                const dupQ = query(
                  collection(db, 'leads'),
                  where('phone', '==', lead.phone)
                );
                const dupSnap = await getDocs(dupQ);
                const duplicateRow = dupSnap.docs.map(d => ({id: d.id, ...d.data()}) as any).find(d => !d.isDeleted && d.branch === lead.branch);
                if (duplicateRow) existingLeadId = duplicateRow.id;
             } catch (err) {}

             const docRef = existingLeadId ? doc(db, 'leads', existingLeadId) : doc(collection(db, 'leads'));
             
             const payload = {
                 ...lead,
                 id: docRef.id,
                 updatedAt: serverTimestamp(),
                 isDeleted: false,
             };
             
             if (!existingLeadId) {
                payload.createdAt = serverTimestamp();
                payload.creatorEmail = authUserEmail;
                payload.version = 1;
             } else {
                payload.version = increment(1) as any;
             }
             
             try {
                // Upsert to Firestore
                await setDoc(docRef, payload, { merge: true });
                successCount++;
             } catch (err) {
                console.error("Failed to migrate/upsert lead:", lead, err);
             }
         }

         return { success: true, count: successCount };
      } catch (e: any) {
         return { success: false, count: 0, error: e.message };
      }
  }
};
