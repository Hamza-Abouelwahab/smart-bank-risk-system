import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

export default function Profile() {
    const { data, setData, post, processing, errors } = useForm({
        date_of_birth: '',
        phone: '',
        address: '',
    });

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        post('/onboarding/profile');
    };

    return (
        <div className="min-h-screen flex bg-[#FFFCF9]" style={{ fontFamily: "'DM Sans', sans-serif" }}>

            <div className="hidden lg:flex w-[260px] flex-shrink-0 bg-[#0F0D0B] flex-col justify-between p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#E8632A] opacity-10 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[#E8632A] opacity-[0.07] translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#E8632A] rounded-xl flex items-center justify-center font-bold text-white text-base" style={{ fontFamily: "'Syne', sans-serif" }}>B</div>
                    <span className="text-white font-bold text-base" style={{ fontFamily: "'Syne', sans-serif" }}>BankCo</span>
                </div>

                <div className="relative z-10">
                    <div className="text-[#E8632A] text-[10px] font-medium uppercase tracking-[2.5px] mb-5">Account setup</div>
                    {[
                        { num: '01', label: 'Personal info', state: 'active' },
                        { num: '02', label: 'Financial profile', state: 'inactive' },
                        { num: '03', label: 'Confirmation', state: 'inactive' },
                    ].map(s => (
                        <div key={s.num} className="flex items-center gap-3 mb-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                s.state === 'active' ? 'bg-white text-[#0F0D0B]' : 'bg-white/[0.07] text-white/20 border border-white/10'
                            }`} style={{ fontFamily: "'Syne', sans-serif" }}>
                                {s.num}
                            </div>
                            <span className={`text-sm ${s.state === 'active' ? 'text-white font-medium' : 'text-white/25'}`}>{s.label}</span>
                            {s.state === 'active' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E8632A]" />}
                        </div>
                    ))}
                </div>

                <div className="relative z-10 text-white/20 text-[10px] leading-relaxed">
                    256-bit encryption<br />Your data is never shared
                </div>
            </div>

            <div className="flex-1 flex flex-col p-8 lg:p-12 overflow-y-auto">
                <div className="w-full h-0.5 bg-[#EDE8E0] rounded-full mb-10 overflow-hidden">
                    <div className="h-full bg-[#E8632A] rounded-full transition-all duration-500" style={{ width: '33%' }} />
                </div>

                <div className="w-full max-w-md mx-auto flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-8 h-8 bg-[#E8632A] rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
                        <span className="font-bold text-[#0F0D0B]" style={{ fontFamily: "'Syne', sans-serif" }}>BankCo</span>
                    </div>

                    <div className="mb-8">
                        <div className="text-[#E8632A] text-[10px] font-medium uppercase tracking-[2.5px] mb-2">Step 1 of 3</div>
                        <h1 className="text-[28px] font-extrabold text-[#0F0D0B] leading-tight tracking-tight mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                            Personal<br />details
                        </h1>
                        <p className="text-[#9C978F] text-sm">We need a few details to verify your identity.</p>
                    </div>

                    <form onSubmit={submit} className="flex flex-col gap-5 flex-1">
                        <div>
                            <label className="block text-[10px] font-medium text-[#9C978F] uppercase tracking-[2px] mb-2">Date of birth</label>
                            <input
                                type="date"
                                value={data.date_of_birth}
                                onChange={e => setData('date_of_birth', e.target.value)}
                                className="w-full h-11 border-[1.5px] border-[#E8E3DA] rounded-xl px-4 text-sm text-[#0F0D0B] focus:outline-none focus:border-[#E8632A] bg-white transition-colors"
                            />
                            {errors.date_of_birth && <p className="text-red-500 text-xs mt-1.5">{errors.date_of_birth}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-medium text-[#9C978F] uppercase tracking-[2px] mb-2">Phone number</label>
                            <input
                                type="tel"
                                value={data.phone}
                                onChange={e => setData('phone', e.target.value)}
                                placeholder="+212 6XX XXX XXX"
                                className="w-full h-11 border-[1.5px] border-[#E8E3DA] rounded-xl px-4 text-sm text-[#0F0D0B] placeholder-[#C5BFB6] focus:outline-none focus:border-[#E8632A] bg-white transition-colors"
                            />
                            {errors.phone && <p className="text-red-500 text-xs mt-1.5">{errors.phone}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-medium text-[#9C978F] uppercase tracking-[2px] mb-2">Address</label>
                            <textarea
                                value={data.address}
                                onChange={e => setData('address', e.target.value)}
                                rows={3}
                                placeholder="Your full residential address"
                                className="w-full border-[1.5px] border-[#E8E3DA] rounded-xl px-4 py-3 text-sm text-[#0F0D0B] placeholder-[#C5BFB6] focus:outline-none focus:border-[#E8632A] bg-white transition-colors resize-none"
                            />
                            {errors.address && <p className="text-red-500 text-xs mt-1.5">{errors.address}</p>}
                        </div>

                        <div className="mt-auto pt-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full h-11 bg-[#E8632A] hover:bg-[#C4501F] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
                                style={{ fontFamily: "'Syne', sans-serif" }}
                            >
                                {processing ? 'Saving...' : 'Continue to step 2 →'}
                            </button>
                            <p className="text-center text-[10px] text-[#C5BFB6] mt-4">🔒 Protected by 256-bit encryption</p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

Profile.layout = () => null;