<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Models\BankAccount;

class ConfirmController extends Controller
{
    public function create()
    {
        $user = Auth::user()->load(['profile', 'financialProfile']);

        return Inertia::render('Onboarding/Confirm', [
            'profile' => [
                'cin' => $user->profile?->cin,
                'date_of_birth' => $user->profile?->date_of_birth,
                'phone'         => $user->profile?->phone,
                'address'       => $user->profile?->address,
            ],
            'bank' => [
                'account_type'      => session('onboarding.account_type'),
                'employment_status' => $user->financialProfile?->employment_status,
                'occupation'        => $user->financialProfile?->occupation,
                'monthly_income'    => $user->financialProfile?->monthly_income,
                'source_of_funds'   => $user->financialProfile?->source_of_funds,
            ],
        ]);
    }

    public function store(Request $request)
    {

        $accountNumber = $this->generateAccountNumber();
        $rib = $this->generateRib();

        // dd(session('onboarding.account_type'));

        $accountType = session('onboarding.account_type');

        if (!$accountType) {
            return redirect()->route('onboarding.bank');
        }

        $request->user()->bankAccount()->create([
            'account_number' => $accountNumber,
            'rib'            => $rib,
            'account_type'   => $accountType,
            'balance'        => 0.00,
        ]);

        return redirect()->route('dashboard');
    }

    // 👇👇 PUT THEM HERE (inside class, after methods or before — both OK)

    private function generateAccountNumber()
    {
        do {
            $number = 'MA' . rand(10, 99) . rand(1000, 9999) . rand(1000, 9999);
        } while (BankAccount::where('account_number', $number)->exists());

        return $number;
    }

    private function generateRib()
{
    $bankCode = '450';
    $branchCode = '360';

    do {
        $accountPart = str_pad((string) random_int(0, 9999999999999999), 16, '0', STR_PAD_LEFT);
        $key = str_pad((string) random_int(0, 99), 2, '0', STR_PAD_LEFT);

        $rib = $bankCode . $branchCode . $accountPart . $key;
    } while (BankAccount::where('rib', $rib)->exists());

    return $rib;
}
}
