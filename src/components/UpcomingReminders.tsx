import { useMemo } from 'react';
import { Lead } from '../types';
import { Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface UpcomingRemindersProps {
  leads: Lead[];
  onEditLead: (lead: Lead) => void;
}

export default function UpcomingReminders({ leads, onEditLead }: UpcomingRemindersProps) {
  const upcomingLeads = useMemo(() => {
    const now = new Date();
    
    const withReminders = leads.filter(lead => {
      // Must not be closed or failed if it's considered for reminders
      if (lead.finalStatus === 'Đã chốt' || lead.finalStatus === 'Không nghe máy' || lead.finalStatus === 'Khách xa' || lead.finalStatus === 'Sai số') return false;
      
      if (!lead.nextCareDate) return false;
      
      return true;
    });

    // Sort by nearest date first
    return withReminders.sort((a, b) => {
      const dateA = new Date(a.nextCareDate!);
      const dateB = new Date(b.nextCareDate!);
      return dateA.getTime() - dateB.getTime();
    });
  }, [leads]);

  if (upcomingLeads.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col mt-6 mb-6">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
         <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
           <AlertCircle className="w-5 h-5 text-blue-600" />
           Lịch hẹn / Nhắc nhở sắp tới
           <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full ml-2">
             {upcomingLeads.length}
           </span>
         </h2>
      </div>
      <div className="px-6 py-2 overflow-x-auto">
         <div className="flex gap-4 pb-4 w-max">
           {upcomingLeads.map(lead => {
              const careDate = new Date(lead.nextCareDate!);
              const isPast = careDate < new Date();
              
              let dateStr = lead.nextCareDate;
              try {
                 const d = careDate;
                 const pad = (n: number) => n.toString().padStart(2, '0');
                 dateStr = `${pad(d.getHours())}:${pad(d.getMinutes())} - ${pad(d.getDate())}/${pad(d.getMonth()+1)}`;
              } catch(e) {}

              return (
                <div 
                  key={lead.id} 
                  onClick={() => onEditLead(lead)}
                  className={`flex flex-col w-64 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all ${
                     isPast ? 'bg-red-50/50 border-red-200 hover:border-red-300' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-semibold text-gray-900 truncate">{lead.fullName || lead.id}</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded flex items-center gap-1 ${
                       isPast ? 'text-red-700 bg-red-100' : 'text-blue-700 bg-blue-100'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-2 mb-3 h-10">
                     {lead.nextCareNote || 'Không có ghi chú'}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                     <span className="text-xs text-gray-500 font-medium">{lead.phone}</span>
                     <button className="text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-1">
                        XL ngay
                     </button>
                  </div>
                </div>
              );
           })}
         </div>
      </div>
    </div>
  );
}
