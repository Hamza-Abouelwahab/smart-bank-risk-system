<?php


namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOnboardingComplete
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // If any required onboarding field is missing, redirect back
        if ($user && (is_null($user->phone) || is_null($user->date_of_birth) || is_null($user->address))) {
            return redirect()->route('onboarding.profile');
        }

        return $next($request);
    }
}