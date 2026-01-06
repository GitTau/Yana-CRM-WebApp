
import React, { useState } from 'react';

interface LoginScreenProps {
    onLogin: (username: string, password: string) => boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = onLogin(username, password);
        if (!success) {
            setError('Invalid username or password.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-2xl shadow-xl">
                <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/30 mb-4" />
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">YANA<span className="text-brand-600">Ops</span></h2>
                    <p className="text-slate-500 text-sm mt-1">Fleet Management Portal</p>
                </div>
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="username" className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 shadow-sm transition-all"
                        />
                    </div>
                    {error && <p className="text-sm text-rose-600 font-medium text-center bg-rose-50 py-2 rounded-lg">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            className="w-full px-4 py-3 text-sm font-bold text-slate-900 bg-brand-500 rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-400 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
                        >
                            Sign In
                        </button>
                    </div>
                </form>
                <div className="text-[10px] text-center text-slate-400 space-y-1 pt-4 border-t border-slate-100">
                    <p><span className="font-bold text-slate-500">Admin:</span> admin / admin123</p>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                        <div>
                            <span className="font-bold text-slate-500">SF:</span>
                            <br/>ops_sf / sf123
                        </div>
                        <div>
                            <span className="font-bold text-slate-500">NYC:</span>
                            <br/>ops_ny / ny123
                        </div>
                        <div>
                            <span className="font-bold text-slate-500">Austin:</span>
                            <br/>ops_atx / atx123
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
