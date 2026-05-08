import React from "react";
import { Clock, XCircle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingApproval({ status, user, onLogout }) {
  const isPending = !status || status === "pending";

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1a2744] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-white font-bold text-xl">HRS</span>
          </div>
          <h1 className="text-lg font-semibold text-[#1a2744]">HRS Insurance CRM</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {isPending ? (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Account Pending Approval</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Your account has been registered and is awaiting approval from an administrator. You'll be able to log in once your account is approved.
              </p>
              <div className="bg-yellow-50 rounded-xl p-4 mb-6 text-left">
                <p className="text-xs font-semibold text-yellow-700 mb-1.5">What happens next?</p>
                <ul className="text-xs text-yellow-600 space-y-1">
                  <li>• An admin has been notified of your registration</li>
                  <li>• They will review and approve or reject your account</li>
                  <li>• Refresh this page once you've been notified</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Access Request Rejected</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Your account request has been reviewed and was not approved. Please contact your administrator for assistance.
              </p>
            </>
          )}

          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh Status
            </Button>
            <Button variant="ghost" onClick={onLogout} className="w-full text-gray-400 hover:text-gray-600">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>

        {user?.email && (
          <p className="text-center text-xs text-gray-400 mt-4">Signed in as {user.email}</p>
        )}
      </div>
    </div>
  );
}