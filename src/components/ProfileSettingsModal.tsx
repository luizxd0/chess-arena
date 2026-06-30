import React, { useState } from 'react';
import { Settings, X, Palette, Lock, Mail, UserMinus, ShieldAlert, Check } from 'lucide-react';
import { auth } from '../lib/firebase';
import { updateEmail, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { BoardTheme } from './ChessBoard';

interface ProfileSettingsModalProps {
  onClose: () => void;
  boardTheme: BoardTheme;
  onUpdateBoardTheme: (theme: BoardTheme) => void;
  onSignOut: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ onClose, boardTheme, onUpdateBoardTheme, onSignOut }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance'>('appearance');
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // required for re-auth
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await updateEmail(auth.currentUser, newEmail);
      setSuccess('Email updated successfully!');
      setNewEmail('');
      setCurrentPassword('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update email. You may need to provide current password.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await updatePassword(auth.currentUser, newPassword);
      setSuccess('Password updated successfully!');
      setNewPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update password. You may need to provide current password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser) return;
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
    setLoading(true);
    setError('');
    try {
      if (currentPassword) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email || '', currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await deleteUser(auth.currentUser);
      onSignOut();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to delete account. Please provide current password and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="bg-[#121212] px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
          <h2 className="font-sans font-black text-lg text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#4CAF50]" />
            Settings
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#2A2A2A] hover:bg-[#333] text-gray-400 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2A2A2A]">
          <button
            onClick={() => { setActiveTab('appearance'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'appearance' ? 'text-[#4CAF50] border-b-2 border-[#4CAF50]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Palette className="w-4 h-4" /> Appearance
          </button>
          <button
            onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'text-[#4CAF50] border-b-2 border-[#4CAF50]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Settings className="w-4 h-4" /> Account
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[60vh]">
          
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/30 border border-red-800/30 flex items-start gap-2 text-[11px] text-red-400">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 rounded-xl bg-green-950/30 border border-green-800/30 flex items-start gap-2 text-[11px] text-green-400">
              <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{success}</div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Board Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'elegant', label: 'Elegant' },
                    { id: 'emerald', label: 'Emerald' },
                    { id: 'wood', label: 'Maple Wood' },
                    { id: 'cyber', label: 'Cyber Neon' },
                    { id: 'royal', label: 'Royal' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => onUpdateBoardTheme(theme.id as BoardTheme)}
                      className={`p-3 rounded-xl border text-sm font-bold transition text-left flex items-center justify-between ${
                        boardTheme === theme.id 
                          ? 'bg-[#2A2A2A] border-[#4CAF50] text-[#4CAF50]' 
                          : 'bg-[#121212] border-[#2A2A2A] text-gray-400 hover:text-white'
                      }`}
                    >
                      {theme.label}
                      {boardTheme === theme.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {!auth.currentUser ? (
                <div className="text-sm text-gray-400 text-center py-4">Account settings are not available for guest users.</div>
              ) : (
                <>
                  <div className="bg-[#121212] p-4 rounded-xl border border-[#2A2A2A]">
                    <div className="text-xs text-gray-400 mb-3">To make changes to your account, please confirm your current password first.</div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#4CAF50] rounded-xl py-2 px-3 text-xs font-medium text-white placeholder-gray-600 outline-hidden transition"
                      />
                    </div>
                  </div>

                  <form onSubmit={handleUpdateEmail} className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Email</label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder={auth.currentUser?.email || "New Email Address"}
                          className="flex-1 bg-[#121212] border border-[#2A2A2A] focus:border-[#4CAF50] rounded-xl py-2 px-3 text-xs font-medium text-white placeholder-gray-600 outline-hidden transition"
                          required
                        />
                        <button
                          type="submit"
                          disabled={loading || !newEmail}
                          className="px-4 py-2 rounded-xl bg-[#4CAF50] hover:bg-[#388E3C] disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1"
                        >
                          <Mail className="w-3.5 h-3.5" /> Update
                        </button>
                      </div>
                    </div>
                  </form>

                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Change Password</label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New Password"
                          className="flex-1 bg-[#121212] border border-[#2A2A2A] focus:border-[#4CAF50] rounded-xl py-2 px-3 text-xs font-medium text-white placeholder-gray-600 outline-hidden transition"
                          required
                          minLength={6}
                        />
                        <button
                          type="submit"
                          disabled={loading || !newPassword}
                          className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs transition flex items-center justify-center gap-1"
                        >
                          <Lock className="w-3.5 h-3.5" /> Update
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="border-t border-[#2A2A2A] pt-4 mt-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl border border-red-900/50 bg-red-950/20 hover:bg-red-900/40 text-red-400 font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      <UserMinus className="w-4 h-4" /> Delete Account
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
