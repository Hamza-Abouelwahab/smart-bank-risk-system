<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ConfirmController extends Controller
{
    public function create()
    {
        $user = Auth::user();
        

        return Inertia::render('Onboarding/Confirm', [
            'profile' => [
                'date_of_birth' => $user->date_of_birth,
                'phone'         => $user->phone,
                'address'       => $user->address,
            ],
            'bank' => [
                'account_type'      => $user->account_type,
                'employment_status' => $user->employment_status,
                'occupation'        => $user->occupation,
                'monthly_income'    => $user->monthly_income,
                'source_of_funds'   => $user->source_of_funds,
            ],
        ]);
    }

    public function store(Request $request)
    {
        return redirect()->route('dashboard');
    }
}
