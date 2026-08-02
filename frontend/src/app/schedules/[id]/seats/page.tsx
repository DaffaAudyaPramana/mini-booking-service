'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function SeatsPage() {
  const params = useParams();
  const scheduleId = params.id as string;
  const router = useRouter();

  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchSeats();
  }, [scheduleId]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      showMessage('Lock time expired. Please select a seat again.', 'error');
      setSelectedSeat(null);
      setCountdown(null);
      fetchSeats();
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const fetchSeats = async () => {
    try {
      const res = await fetch(`http://localhost:4000/schedules/${scheduleId}/seats`);
      const data = await res.json();
      setSeats(data);
    } catch (err) {
      showMessage('Failed to load seats.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    if (type === 'error') {
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    }
  };

  const handleSelectSeat = async (seat: any) => {
    if (seat.status !== 'AVAILABLE') return;

    setLocking(true);
    setMessage({ text: '', type: '' });
    
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://localhost:4000/schedules/${scheduleId}/seats/${seat.id}/lock`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to lock seat');
      }

      setSelectedSeat(seat);
      setCountdown(300); // 5 mins
      showMessage(`Successfully locked seat ${seat.seatNumber}.`, 'success');
      
      setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, status: 'LOCKED' } : s));
    } catch (err: any) {
      showMessage(err.message, 'error');
      fetchSeats();
    } finally {
      setLocking(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedSeat) return;
    
    setBooking(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('http://localhost:4000/bookings/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ scheduleId, seatId: selectedSeat.id })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to confirm booking');
      }

      showMessage(`🎉 Success! Seat ${selectedSeat.seatNumber} is yours.`, 'success');
      setSelectedSeat(null);
      setCountdown(null);
      fetchSeats();
    } catch (err: any) {
      showMessage(err.message, 'error');
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin h-12 w-12 border-4 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative p-4 md:p-8 overflow-hidden pb-40">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[800px] bg-violet-900/20 rounded-full blur-[120px] -z-10" />

      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => router.push('/schedules')}
          className="group flex items-center gap-2 mb-8 text-sm font-medium text-slate-400 hover:text-white transition"
        >
          <span className="p-2 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition">&larr;</span>
          Back to Routes
        </button>

        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight">
            Select Your Seat
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Choose your preferred spot. We'll hold it for you for 5 minutes.</p>
        </header>

        {message.text && (
          <div className={`mb-8 p-4 rounded-xl border backdrop-blur-sm animate-in fade-in slide-in-from-top-4 ${
            message.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <div className="flex items-center gap-3">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              ) : (
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-12 p-4 glass-card rounded-2xl w-fit mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-600 bg-slate-800/50" />
            <span className="text-sm text-slate-300">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-yellow-500/50 bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.3)] animate-pulse" />
            <span className="text-sm text-yellow-300">Your Lock</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-slate-700 bg-slate-900" />
            <span className="text-sm text-slate-500">Locked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-red-500/30 bg-red-500/20" />
            <span className="text-sm text-red-400">Sold</span>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="glass-card p-8 md:p-12 rounded-3xl mx-auto max-w-2xl border-t border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:gap-y-8 place-items-center">
            {seats.map(seat => {
              const isAvailable = seat.status === 'AVAILABLE';
              const isMyLock = seat.status === 'LOCKED' && seat.id === selectedSeat?.id;
              const isOtherLock = seat.status === 'LOCKED' && !isMyLock;
              const isBooked = seat.status === 'BOOKED';

              let styleClasses = '';
              
              if (isAvailable) {
                styleClasses = 'bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-cyan-400 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer';
              } else if (isMyLock) {
                styleClasses = 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.3)] animate-pulse cursor-pointer';
              } else if (isOtherLock) {
                styleClasses = 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed opacity-70';
              } else if (isBooked) {
                styleClasses = 'bg-red-500/10 border-red-900/50 text-red-500/50 cursor-not-allowed';
              }

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSelectSeat(seat)}
                  disabled={!isAvailable || locking || !!selectedSeat}
                  className={`
                    relative w-20 h-24 md:w-24 md:h-28 rounded-t-2xl rounded-b-lg border-2 
                    flex flex-col items-center justify-center transition-all duration-300
                    ${styleClasses}
                  `}
                >
                  {/* Seat top accent */}
                  <div className={`absolute top-0 inset-x-4 h-2 rounded-b-md ${isMyLock ? 'bg-yellow-400/50' : 'bg-white/5'}`} />
                  <span className="text-xl md:text-2xl font-black">{seat.seatNumber}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Action Bar */}
        {selectedSeat && countdown !== null && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-in slide-in-from-bottom-full">
            <div className="max-w-4xl mx-auto glass-card border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              
              <div className="flex items-center gap-6">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Selected Seat</p>
                  <p className="text-3xl font-black text-cyan-400">{selectedSeat.seatNumber}</p>
                </div>
                
                <div>
                  <p className="text-sm text-slate-400 font-medium mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500 animate-spin-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    Lock Expires In
                  </p>
                  <div className={`text-4xl font-mono font-black tabular-nums ${countdown < 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                    {formatTime(countdown)}
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmBooking}
                disabled={booking}
                className="group relative w-full md:w-auto px-10 py-4 rounded-xl font-bold text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-cyan-600 transition-transform duration-300 group-hover:scale-105" />
                <span className="relative flex items-center justify-center gap-2 text-lg">
                  {booking ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Confirming...
                    </>
                  ) : (
                    'Confirm & Pay'
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
