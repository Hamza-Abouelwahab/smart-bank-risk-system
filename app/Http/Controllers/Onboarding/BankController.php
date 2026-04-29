<?php

namespace App\Http\Controllers\Onboarding;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BankController extends Controller
{
    public function create()
    {
        return Inertia::render('Onboarding/Bank');
    }

    public function store(Request $request)
    {
        $request->validate([
            'account_type'      => 'required|in:savings,current',
            'employment_status' => 'required|string',
            'occupation'        => 'required|string|max:100',
            'monthly_income'    => 'required|string',
            'source_of_funds'   => 'required|string',
        ]);

        $request->user()->update([
            'account_type'      => $request->account_type,
            'employment_status' => $request->employment_status,
            'occupation'        => $request->occupation,
            'monthly_income'    => $request->monthly_income,
            'source_of_funds'   => $request->source_of_funds,
        ]);

        return redirect()->route('onboarding.confirm');
    }
}