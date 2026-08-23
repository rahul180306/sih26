'use client';

import React, { useState } from 'react';
import { X, Send, CheckCircle, Building2, Mail, Phone, User } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    city: '',
    role: 'Municipal Corporation / Smart City Officer',
    message: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      <div className="w-full max-w-[620px] bg-[#090E15] border border-white/15 rounded-[36px] overflow-hidden text-white shadow-2xl relative">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#151A20]">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#F56A00] block mb-0.5">
              Smart City Deployment
            </span>
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-white">
              Contact JalRakshak Urban Team
            </h2>
          </div>

          <button
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-[24px] font-extrabold text-white mb-2">
                Deployment Request Received!
              </h3>
              <p className="text-[14px] text-white/80 max-w-[400px] mb-6">
                Thank you for reaching out. Our urban climate engineering lead will connect with your municipality within 24 hours.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-full bg-[#F56A00] text-white font-extrabold text-[14px]"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-extrabold uppercase tracking-wider text-white/80 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/40 absolute left-4 top-3.5" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Dr. Rajesh Kumar"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#151A20] border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-[14px] text-white focus:outline-none focus:border-[#F56A00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-extrabold uppercase tracking-wider text-white/80 mb-1.5">
                    Official Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/40 absolute left-4 top-3.5" />
                    <input
                      required
                      type="email"
                      placeholder="name@city.gov.in"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#151A20] border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-[14px] text-white focus:outline-none focus:border-[#F56A00]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-extrabold uppercase tracking-wider text-white/80 mb-1.5">
                    City / Municipality
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-white/40 absolute left-4 top-3.5" />
                    <input
                      required
                      type="text"
                      placeholder="e.g. Greater Chennai Corporation"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-[#151A20] border border-white/15 rounded-2xl pl-11 pr-4 py-3 text-[14px] text-white focus:outline-none focus:border-[#F56A00]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-extrabold uppercase tracking-wider text-white/80 mb-1.5">
                  Deployment Scope / Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your city drainage network and flood mitigation goals..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-[#151A20] border border-white/15 rounded-2xl p-4 text-[14px] text-white focus:outline-none focus:border-[#F56A00]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#F56A00] text-white font-extrabold text-[15px] flex items-center justify-center gap-2 hover:bg-[#FF7200] transition-colors shadow-lg shadow-orange-950/40"
              >
                <span>Request Smart City Briefing</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
