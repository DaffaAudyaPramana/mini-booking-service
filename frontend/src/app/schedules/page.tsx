'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetch('http://localhost:4000/schedules')
      .then(res => res.json())
      .then(data => {
        setSchedules(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [router]);

  return (
    <div className="min-h-screen p-8 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px] -z-10 animate-pulse-fast" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] -z-10" />

      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-slate-700/50 pb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Available Routes
            </h1>
            <p className="text-slate-400 mt-2">Select a journey to proceed with seat selection.</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              router.push('/login');
            }}
            className="text-sm font-medium text-slate-400 hover:text-white transition px-4 py-2 rounded-lg hover:bg-slate-800"
          >
            Sign Out
          </button>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-10 w-10 border-4 border-violet-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid gap-6">
            {schedules.map((schedule, index) => (
              <div 
                key={schedule.id} 
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-2xl opacity-0 blur transition duration-500 group-hover:opacity-20" />
                
                <div className="glass-card relative flex flex-col md:flex-row justify-between items-center p-6 md:p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex-1 w-full mb-6 md:mb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        {schedule.route?.operator?.name}
                      </span>
                      <span className="text-sm text-slate-400 font-medium flex items-center gap-1">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        {new Date(schedule.departure).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4">
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {schedule.route?.origin}
                      </div>
                      <div className="flex-1 max-w-[100px] flex items-center">
                        <div className="h-[2px] w-full bg-slate-700 relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                        </div>
                      </div>
                      <div className="text-2xl md:text-3xl font-bold text-white">
                        {schedule.route?.destination}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end justify-center w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-700/50 pt-6 md:pt-0 md:pl-8">
                    <div className="text-sm text-slate-400 font-medium mb-1">Price per seat</div>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-6">
                      Rp {schedule.price.toLocaleString('id-ID')}
                    </div>
                    <button
                      onClick={() => router.push(`/schedules/${schedule.id}/seats`)}
                      className="w-full md:w-auto neon-border px-8 py-3 bg-slate-800 rounded-xl font-bold text-white transition hover:bg-slate-700 hover:shadow-[0_0_20px_rgba(109,40,217,0.4)]"
                    >
                      Select Seats &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {schedules.length === 0 && (
              <div className="text-center py-20 glass-card rounded-2xl">
                <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                <p className="text-xl text-slate-400 font-medium">No active schedules found.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
