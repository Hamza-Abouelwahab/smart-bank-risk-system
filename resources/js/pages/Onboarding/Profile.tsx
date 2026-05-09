import { router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';

import { createWorker } from 'tesseract.js';

export default function Profile() {
    const { profile } = usePage().props as any;

    const { data, setData, post, processing, errors } = useForm({
        date_of_birth: profile?.date_of_birth ?? '',
        cin: profile?.cin ?? '',
        phone: profile?.phone ?? '',
        address: profile?.address ?? '',
    });

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [cameraOpen, setCameraOpen] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState('');
    const [scanSuccess, setScanSuccess] = useState(false);
    const [ocrDebugText, setOcrDebugText] = useState('');

    const clearScannedFields = () => {
        setData('cin', '');
        setData('date_of_birth', '');
        setData('address', '');
    };

    const preprocessImageVariants = async (file: File | Blob): Promise<string[]> => {
        const imageUrl = URL.createObjectURL(file);

        const image = new Image();
        image.src = imageUrl;

        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject();
        });

        const createCanvas = (mode: 'normal' | 'gray' | 'threshold' | 'invert') => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('Canvas not supported');
            }

            // Important: upscale image for OCR
            const targetWidth = 2200;
            const scale = targetWidth / image.width;

            canvas.width = targetWidth;
            canvas.height = image.height * scale;

            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            for (let i = 0; i < pixels.length; i += 4) {
                const gray =
                    0.299 * pixels[i] +
                    0.587 * pixels[i + 1] +
                    0.114 * pixels[i + 2];

                let value = gray;

                if (mode === 'gray') {
                    value = Math.max(0, Math.min(255, (gray - 128) * 1.8 + 128));
                }

                if (mode === 'threshold') {
                    value = gray > 145 ? 255 : 0;
                }

                if (mode === 'invert') {
                    value = 255 - gray;
                }

                if (mode !== 'normal') {
                    pixels[i] = value;
                    pixels[i + 1] = value;
                    pixels[i + 2] = value;
                }
            }

            ctx.putImageData(imageData, 0, 0);

            return canvas.toDataURL('image/png');
        };

        const variants = [
            createCanvas('normal'),
            createCanvas('gray'),
            createCanvas('threshold'),
            createCanvas('invert'),
        ];

        URL.revokeObjectURL(imageUrl);

        return variants;
    };

    const extractMoroccanCinData = (ocrText: string) => {
    const readableText = ocrText
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/[|]/g, 'I')
        .replace(/[«»]/g, '')
        .replace(/O(?=\d)/g, '0')
        .replace(/(?<=\d)O/g, '0')
        .trim();

    setOcrDebugText(readableText);

    const compactText = readableText.replace(/[^A-Z0-9]/g, '');

    console.log('OCR CLEAN TEXT:', readableText);
    console.log('OCR COMPACT TEXT:', compactText);

    const candidates = compactText.match(/[A-Z]{1,2}[0-9]{5,8}/g) ?? [];

    const badPrefixes = [
        'ON',
        'NO',
        'ID',
        'LE',
        'LA',
        'DE',
        'DU',
        'ET',
        'EN',
        'UN',
        'NE',
        'RE',
        'CE',
    ];

    const validCandidates = candidates.filter((candidate) => {
        const prefix = candidate.match(/^[A-Z]{1,2}/)?.[0] ?? '';
        const numbers = candidate.replace(/^[A-Z]{1,2}/, '');

        return (
            numbers.length >= 5 &&
            numbers.length <= 8 &&
            !badPrefixes.includes(prefix)
        );
    });

    const candidateCounts = validCandidates.reduce<Record<string, number>>((acc, candidate) => {
        acc[candidate] = (acc[candidate] ?? 0) + 1;
        return acc;
    }, {});

    const sortedCandidates = Object.entries(candidateCounts).sort((a, b) => b[1] - a[1]);

    let cin = '';
    let cinConfidence: 'low' | 'high' = 'low';

    // Only trust CIN if it appears at least once and is not one of many random options
    if (sortedCandidates.length === 1) {
        cin = sortedCandidates[0][0];
        cinConfidence = 'high';
    } else if (sortedCandidates.length > 1 && sortedCandidates[0][1] > sortedCandidates[1][1]) {
        cin = sortedCandidates[0][0];
        cinConfidence = 'high';
    }

    const dateCandidates: string[] = [];

    const spacedDates = readableText.matchAll(
        /\b([0-3]?[0-9])[\s\/\-\.]+([0-1]?[0-9])[\s\/\-\.]+([12][0-9]{3})\b/g,
    );

    for (const match of spacedDates) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3];

        dateCandidates.push(`${year}-${month}-${day}`);
    }

    const compactDates = compactText.matchAll(/([0-3][0-9])([0-1][0-9])([12][0-9]{3})/g);

    for (const match of compactDates) {
        const day = match[1];
        const month = match[2];
        const year = match[3];

        dateCandidates.push(`${year}-${month}-${day}`);
    }

    const validDates = dateCandidates.filter((date) => {
        const birthDate = new Date(date);
        const now = new Date();

        if (Number.isNaN(birthDate.getTime())) return false;

        const age = now.getFullYear() - birthDate.getFullYear();

        return age >= 18 && age <= 80;
    });

    return {
        cin,
        cinConfidence,
        date_of_birth: validDates[0] ?? '',
        candidates: validCandidates,
    };
};

    const scanImageWithOcr = async (file: File | Blob) => {
    clearScannedFields();

    setScanning(true);
    setScanMessage('Reading CIN card. Please wait...');
    setScanSuccess(false);
    setOcrDebugText('');

    try {
        const processedImages = await preprocessImageVariants(file);

        const worker = await createWorker('eng');

        await worker.setParameters({
            tessedit_char_whitelist:
                'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-.: ',
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1',
        });

        const texts: string[] = [];

        for (const image of processedImages) {
            const result = await worker.recognize(image);
            texts.push(result.data.text);
        }

        await worker.terminate();

        const allText = texts.join('\n\n--- OCR VARIANT ---\n\n');

        console.log('OCR ALL TEXT:', allText);

        const extracted = extractMoroccanCinData(allText);

        if (extracted.cin && extracted.cinConfidence === 'high') {
            setData('cin', extracted.cin);
        }

        if (extracted.date_of_birth) {
            setData('date_of_birth', extracted.date_of_birth);
        }

        setData('address', '');

        if (extracted.cin || extracted.date_of_birth) {
            setScanSuccess(true);
            setScanMessage('Some data was detected. Please verify it carefully before continuing.');
        } else {
            setScanSuccess(false);
            setScanMessage('We could not read the CIN clearly. Take a closer photo of the card text area.');
        }
    } catch (error) {
        console.log('OCR ERROR:', error);

        setScanSuccess(false);
        setScanMessage('Could not read the card. Try another photo or fill manually.');
    } finally {
        setScanning(false);
    }
};

    const openCamera = async () => {
        clearScannedFields();

        setScanMessage('');
        setScanSuccess(false);

        if (!navigator.mediaDevices?.getUserMedia) {
            setScanMessage('Your browser does not support camera access.');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });

            setCameraOpen(true);

            setTimeout(async () => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            }, 100);
        } catch {
            setScanMessage('Camera access failed. Please allow camera permission or use manual entry.');
        }
    };

    const stopCamera = () => {
        const stream = videoRef.current?.srcObject as MediaStream | null;

        stream?.getTracks().forEach((track) => track.stop());

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraOpen(false);
    };

    const captureAndScan = async () => {
        if (!videoRef.current || !canvasRef.current) {
            setScanMessage('Camera is not ready yet.');
            return;
        }

        const video = videoRef.current;

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            setScanMessage('Camera is still loading. Wait one second and try again.');
            return;
        }

        setScanning(true);
        setScanMessage('Scanning national card...');
        setScanSuccess(false);

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext('2d');

        if (!context) {
            setScanning(false);
            setScanMessage('Could not prepare camera image.');
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
            async (blob) => {
                if (!blob) {
                    setScanning(false);
                    setScanMessage('Could not capture image. Try again.');
                    return;
                }

                await scanImageWithOcr(blob);
                stopCamera();
            },
            'image/jpeg',
            0.9,
        );
    };

    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        post('/onboarding/profile', {
            preserveScroll: true,
            onSuccess: () => {
                router.visit('/onboarding/bank', {
                    replace: true,
                });
            },
        });
    };

    return (
        <div
            className="flex min-h-screen bg-[#f8f6f1] dark:bg-[#0f0d0b]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
            <div className="relative hidden w-[260px] flex-shrink-0 flex-col justify-between overflow-hidden bg-[#1f1a17] p-8 lg:flex dark:bg-[#0f0d0b]">
                <div className="absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600 opacity-10" />
                <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-orange-600 opacity-[0.07]" />

                <div className="relative z-10 flex items-center gap-3">
                    <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-base font-bold text-white"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                        B
                    </div>
                    <span
                        className="text-base font-bold text-white"
                        style={{ fontFamily: "'Syne', sans-serif" }}
                    >
                        BANK AL-ANDALOUS
                    </span>
                </div>

                <div className="relative z-10">
                    <div className="mb-5 text-[10px] font-medium tracking-[2.5px] text-orange-600 uppercase">
                        Account setup
                    </div>
                    {[
                        { num: '01', label: 'Personal info', state: 'active' },
                        {
                            num: '02',
                            label: 'Financial profile',
                            state: 'inactive',
                        },
                        { num: '03', label: 'Confirmation', state: 'inactive' },
                    ].map((s) => (
                        <div
                            key={s.num}
                            className="mb-4 flex items-center gap-3"
                        >
                            <div
                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.state === 'active'
                                    ? 'bg-white text-[#0F0D0B]'
                                    : 'border border-white/10 bg-white/[0.07] text-white/20'
                                    }`}
                                style={{ fontFamily: "'Syne', sans-serif" }}
                            >
                                {s.num}
                            </div>
                            <span
                                className={`text-sm ${s.state === 'active' ? 'font-medium text-white' : 'text-white/25'}`}
                            >
                                {s.label}
                            </span>
                            {s.state === 'active' && (
                                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-600" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="relative z-10 text-[10px] leading-relaxed text-white/20">
                    256-bit encryption
                    <br />
                    Your data is never shared
                </div>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-8 lg:p-12">
                <div className="mb-10 h-0.5 w-full overflow-hidden rounded-full bg-orange-100/60 dark:bg-[#7a2800]/30">
                    <div
                        className="h-full rounded-full bg-orange-600 transition-all duration-500"
                        style={{ width: '33%' }}
                    />
                </div>

                <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
                    <div className="mb-8 flex items-center gap-2 lg:hidden">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-sm font-bold text-white">
                            B
                        </div>
                        <span
                            className="font-bold text-[#1f1a17] dark:text-white"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            BANK AL-ANDALOUS
                        </span>
                    </div>

                    <div className="mb-8">
                        <div className="mb-2 text-[10px] font-medium tracking-[2.5px] text-orange-600 uppercase">
                            Step 1 of 3
                        </div>
                        <h1
                            className="mb-2 text-[28px] leading-tight font-extrabold tracking-tight text-[#1f1a17] dark:text-white"
                            style={{ fontFamily: "'Syne', sans-serif" }}
                        >
                            Personal
                            <br />
                            details
                        </h1>
                        <p className="text-sm text-[#1f1a17]/60 dark:text-white/60">
                            We need a few details to verify your identity.
                        </p>
                    </div>

                    <form
                        onSubmit={submit}
                        className="flex flex-1 flex-col gap-5"
                    >

                        <div className="rounded-3xl border border-orange-200/60 bg-white p-4 shadow-sm dark:border-[#7a2800]/40 dark:bg-[#1f1a17]">
                            <div className="flex items-start justify-between gap-4">
                                <div>


                                    <div className="mb-1 text-[10px] font-bold tracking-[2px] text-orange-600 uppercase">
                                        Identity scan
                                    </div>

                                    <h3
                                        className="text-lg font-extrabold text-[#1f1a17] dark:text-white"
                                        style={{ fontFamily: "'Syne', sans-serif" }}
                                    >
                                        Scan your national card
                                    </h3>

                                    <p className="mt-1 text-xs leading-relaxed text-[#1f1a17]/55 dark:text-white/55">
                                        Use your webcam to capture your CIN card. We will auto-fill your information.
                                    </p>
                                </div>

                                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-xl dark:bg-[#7a2800]/30">
                                    🪪
                                </div>
                            </div>

                            {!cameraOpen ? (
                                <button
                                    type="button"
                                    onClick={openCamera}
                                    className="mt-4 h-11 w-full rounded-xl border border-orange-200 bg-orange-50 text-sm font-bold text-orange-700 transition hover:bg-orange-100 dark:border-[#7a2800]/40 dark:bg-[#24130d] dark:text-orange-300"
                                >
                                    Use live camera on computer
                                </button>
                            ) : (
                                <div className="mt-4 overflow-hidden rounded-2xl border border-orange-200/60 bg-black dark:border-[#7a2800]/40">
                                    <div className="relative">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="h-64 w-full object-cover"
                                        />

                                        <div className="pointer-events-none absolute inset-5 rounded-2xl border-2 border-dashed border-white/80" />

                                        <div className="pointer-events-none absolute right-5 bottom-5 left-5 rounded-xl bg-black/50 px-3 py-2 text-center text-xs font-semibold text-white">
                                            Place the CIN card inside the frame
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 bg-white p-3 dark:bg-[#1f1a17]">
                                        <button
                                            type="button"
                                            onClick={stopCamera}
                                            className="h-11 rounded-xl border border-orange-200 text-sm font-bold text-[#1f1a17] dark:border-[#7a2800]/40 dark:text-white"
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="button"
                                            onClick={captureAndScan}
                                            disabled={scanning}
                                            className="h-11 rounded-xl bg-orange-600 text-sm font-bold text-white transition hover:bg-[#7a2800] disabled:opacity-60"
                                        >
                                            {scanning ? 'Scanning...' : 'Capture'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <canvas ref={canvasRef} className="hidden" />

                            {scanMessage && (
                                <p
                                    className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${scanSuccess
                                        ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                                        : 'bg-orange-50 text-orange-700 dark:bg-[#24130d] dark:text-orange-300'
                                        }`}
                                >
                                    {scanMessage}
                                </p>
                            )}

                            {ocrDebugText && (
                                <details className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-black/30 dark:text-white/70">
                                    <summary className="cursor-pointer font-bold">
                                        Show OCR text
                                    </summary>

                                    <pre className="mt-2 whitespace-pre-wrap break-words">
                                        {ocrDebugText}
                                    </pre>
                                </details>
                            )}
                        </div>

                        <label className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center rounded-xl border border-orange-200 bg-white text-sm font-bold text-[#1f1a17] transition hover:bg-orange-50 dark:border-[#7a2800]/40 dark:bg-[#1f1a17] dark:text-white">
                            Scan CIN with phone camera

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                capture="environment"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];

                                    if (!file) return;

                                    await scanImageWithOcr(file);

                                    e.target.value = '';
                                }}
                            />
                        </label>


                        <div>


                            <label className="mb-2 block text-[10px] font-medium tracking-[2px] text-[#1f1a17]/60 dark:text-white/60 uppercase">
                                CIN
                            </label>

                            <input
                                type="text"
                                name="cin"
                                autoComplete="off"
                                maxLength={8}
                                value={data.cin}
                                onChange={(e) => {
                                    let value = e.target.value.toUpperCase();
                                    value = value.replace(/[^A-Z0-9]/g, '');
                                    setData('cin', value);
                                }}
                                placeholder="AB123456"
                                className="h-11 w-full rounded-xl border-[1.5px] border-orange-200/60 bg-white px-4 text-sm text-[#1f1a17] placeholder-[#1f1a17]/40 transition-colors focus:border-orange-600 focus:outline-none dark:border-[#7a2800]/40 dark:bg-[#1f1a17] dark:text-white dark:placeholder-white/40"
                            />

                            {errors.cin && (
                                <p className="mt-1.5 text-xs text-red-500">
                                    Format: AB123456
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-[10px] font-medium tracking-[2px] text-[#1f1a17]/60 dark:text-white/60 uppercase">
                                Phone number
                            </label>
                            <input
                                type="tel"
                                value={data.phone}
                                onChange={(e) =>
                                    setData('phone', e.target.value)
                                }
                                placeholder="+212 6XX XXX XXX"
                                className="h-11 w-full rounded-xl border-[1.5px] border-orange-200/60 bg-white px-4 text-sm text-[#1f1a17] placeholder-[#1f1a17]/40 transition-colors focus:border-orange-600 focus:outline-none dark:border-[#7a2800]/40 dark:bg-[#1f1a17] dark:text-white dark:placeholder-white/40"
                            />
                            {errors.phone && (
                                <p className="mt-1.5 text-xs text-red-500">
                                    {errors.phone}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-medium tracking-[2px] text-[#1f1a17]/60 dark:text-white/60 uppercase">
                                Date of birth
                            </label>
                            <input
                                type="date"
                                value={data.date_of_birth}
                                onChange={(e) =>
                                    setData('date_of_birth', e.target.value)
                                }
                                className="h-11 w-full rounded-xl border-[1.5px] border-orange-200/60 bg-white px-4 text-sm text-[#1f1a17] transition-colors focus:border-orange-600 focus:outline-none dark:border-[#7a2800]/40 dark:bg-[#1f1a17] dark:text-white"
                            />
                            {errors.date_of_birth && (
                                <p className="mt-1.5 text-xs text-red-500">
                                    {errors.date_of_birth}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-[10px] font-medium tracking-[2px] text-[#1f1a17]/60 dark:text-white/60 uppercase">
                                Address
                            </label>
                            <textarea
                                value={data.address}
                                onChange={(e) =>
                                    setData('address', e.target.value)
                                }
                                rows={3}
                                placeholder="Your full residential address"
                                className="w-full resize-none rounded-xl border-[1.5px] border-orange-200/60 bg-white px-4 py-3 text-sm text-[#1f1a17] placeholder-[#1f1a17]/40 transition-colors focus:border-orange-600 focus:outline-none dark:border-[#7a2800]/40 dark:bg-[#1f1a17] dark:text-white dark:placeholder-white/40"
                            />
                            {errors.address && (
                                <p className="mt-1.5 text-xs text-red-500">
                                    {errors.address}
                                </p>
                            )}
                        </div>

                        <div className="mt-auto pt-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="h-11 w-full rounded-xl bg-orange-600 text-sm font-bold text-white transition-colors hover:bg-[#7a2800] disabled:opacity-50"
                                style={{ fontFamily: "'Syne', sans-serif" }}
                            >
                                {processing
                                    ? 'Saving...'
                                    : 'Continue to step 2 →'}
                            </button>
                            <p className="mt-4 text-center text-[10px] text-[#1f1a17]/50 dark:text-white/50">
                                🔒 Protected by 256-bit encryption
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

Profile.layout = () => null;
