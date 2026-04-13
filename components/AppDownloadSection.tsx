"use client";

import { useState } from "react";

export default function AppDownloadSection() {
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-br from-blue-50 to-indigo-50 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Get 101 Hub on Your Phone
          </h2>
          <p className="text-lg text-gray-600">
            Install our mobile app for faster shopping, offline access, and instant order updates.
          </p>
        </div>

        {/* Download Options Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* iOS */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-gray-900 rounded-full mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 13.5C17.05 15.81 15.27 17.5 13.29 17.5C12.36 17.5 11.51 17.15 10.87 16.6C10.16 17.15 9.23 17.5 8.27 17.5C6.18 17.5 4.5 15.81 4.5 13.5C4.5 12.14 5.1 10.95 6.05 10.19C5.84 9.5 5.5 8.69 5.5 7.5C5.5 4.46 7.96 2 11 2C14.04 2 16.5 4.46 16.5 7.5C16.5 8.69 16.16 9.5 15.95 10.19C16.9 10.95 17.5 12.14 17.5 13.5H17.05Z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">iPhone & iPad</h3>
            <p className="text-gray-600 text-center mb-6">
              Add 101 Hub to your home screen in seconds
            </p>
            <button
              onClick={() => setShowIOSInstructions(!showIOSInstructions)}
              className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition-colors mb-4"
            >
              {showIOSInstructions ? "Hide Instructions" : "View Instructions"}
            </button>

            {showIOSInstructions && (
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-3">
                <p className="font-semibold">How to install:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open this website in Safari</li>
                  <li>Tap the Share button (box with arrow)</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Name it "101 Hub"</li>
                  <li>Tap "Add" in the top right</li>
                </ol>
                <p className="text-xs text-gray-500 pt-2">
                  The app will work just like a native app but updates automatically!
                </p>
              </div>
            )}
          </div>

          {/* Android */}
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.6 9.48l1.84-1.84c.39-.39.39-1.02 0-1.41l-1.41-1.41c-.39-.39-1.02-.39-1.41 0L15.77 6.7l-2.29-2.29c-.39-.39-1.02-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41l1.84 1.84-1.84 1.84c-.39.39-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0l1.84-1.84 1.84 1.84c.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41L17.6 9.48zM13 5.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-4">Android</h3>
            <p className="text-gray-600 text-center mb-6">
              Install the app directly from your browser
            </p>
            <button
              onClick={() => setShowAndroidInstructions(!showAndroidInstructions)}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition-colors mb-4"
            >
              {showAndroidInstructions ? "Hide Instructions" : "View Instructions"}
            </button>

            {showAndroidInstructions && (
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 space-y-3">
                <p className="font-semibold">How to install:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Open this website in Chrome or Edge</li>
                  <li>Tap the menu (3 dots) in top right</li>
                  <li>Tap "Install app"</li>
                  <li>Confirm the installation</li>
                  <li>The app will appear on your home screen</li>
                </ol>
                <p className="text-xs text-gray-500 pt-2">
                  You can also use the "Get app" banner at the top of the browser.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Why Install the App?</h3>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Lightning Fast</h4>
                <p className="text-gray-600 text-sm">Instant loading and smooth performance</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Push Notifications</h4>
                <p className="text-gray-600 text-sm">Get instant order and deal updates</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.172l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5-4a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Works Offline</h4>
                <p className="text-gray-600 text-sm">Browse products even without internet</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-indigo-500 text-white">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v2a2 2 0 01-2 2H7a2 2 0 01-2-2v-2m14-4V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2z" />
                  </svg>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Home Screen Access</h4>
                <p className="text-gray-600 text-sm">Quick access just like a native app</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <p className="text-gray-600 text-sm">
            No app store required. Install directly from your browser. It's free!
          </p>
        </div>
      </div>
    </section>
  );
}
