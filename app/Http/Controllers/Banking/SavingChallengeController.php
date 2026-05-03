<?php

namespace App\Http\Controllers\Banking;

use App\Http\Controllers\Controller;
use App\Models\SavingChallenge;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class SavingChallengeController extends Controller
{
    public function create() {
        return Inertia::render('Banking/SavingChallenge/Create') ;
    }

    public function store(Request $request) {
        $validated = $request->validate([
            'name' => 'required|string|max:100' ,
            'target_amount' => 'required|numeric|min:100' ,
            'end_date' => 'required|date|after:today' ,
        ]);

        SavingChallenge::create([
            'user_id' => Auth::id() ,
            'name' => $validated['name'] ,
            'target_amount' => $validated['target_amount'] ,
            'saved_amount' => 0 ,
            'start_date' => now() ,
            'end_date' => $validated['end_date'] ,
            'status' => 'active' ,
        ]);
        return redirect()->route('dashboard')->with('success' , 'Saving challenge created successfully. ') ;

    }
}
