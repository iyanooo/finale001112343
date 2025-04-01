import React from 'react';
import { Building2 } from 'lucide-react';

export function AboutUs() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center mb-6">
          <Building2 className="w-16 h-16 text-pink-600" />
        </div>
        <h1 className="text-3xl font-bold text-center mb-8">About Neema Hospital</h1>
        <div className="space-y-6 text-gray-700">
          <p className="text-lg leading-relaxed">
            For three decades, Neema Hospital has been at the forefront of medical excellence, 
            providing comprehensive healthcare solutions to our community and beyond.
          </p>
          <p className="text-lg leading-relaxed">
            Established in 1994, we have grown from a small clinic to a full-service medical 
            facility, equipped with state-of-the-art technology and staffed by experienced 
            healthcare professionals.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <h3 className="font-bold text-xl text-pink-600 mb-2">30+</h3>
              <p>Years of Excellence</p>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <h3 className="font-bold text-xl text-pink-600 mb-2">50k+</h3>
              <p>Patients Served</p>
            </div>
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <h3 className="font-bold text-xl text-pink-600 mb-2">100+</h3>
              <p>Medical Experts</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}