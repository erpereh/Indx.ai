'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';

export default function AuthView() {
    const supabase = createClient();

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a]">
            <div className="w-full max-w-md px-6">
                {/* Branding */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-5 h-5 text-white"
                            >
                                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                                <polyline points="16 7 22 7 22 13" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-white tracking-tight">
                            Indx.ai
                        </span>
                    </div>
                    <p className="text-sm text-slate-400">
                        Tu portfolio de inversiones, bajo control
                    </p>
                </div>

                {/* Auth Form */}
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl p-8 shadow-2xl shadow-black/20">
                    <Auth
                        supabaseClient={supabase}
                        appearance={{
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#10b981',
                                        brandAccent: '#059669',
                                        brandButtonText: 'white',
                                        defaultButtonBackground: '#0f172a',
                                        defaultButtonBackgroundHover: '#1e293b',
                                        defaultButtonBorder: '#334155',
                                        defaultButtonText: '#e2e8f0',
                                        dividerBackground: '#334155',
                                        inputBackground: '#0f172a',
                                        inputBorder: '#334155',
                                        inputBorderHover: '#475569',
                                        inputBorderFocus: '#10b981',
                                        inputText: '#f1f5f9',
                                        inputLabelText: '#94a3b8',
                                        inputPlaceholder: '#64748b',
                                        messageText: '#34d399',
                                        messageTextDanger: '#ef4444',
                                        messageBackground: 'rgba(16, 185, 129, 0.08)',
                                        messageBorder: 'rgba(16, 185, 129, 0.25)',
                                        messageBackgroundDanger: 'rgba(239, 68, 68, 0.08)',
                                        messageBorderDanger: 'rgba(239, 68, 68, 0.25)',
                                        anchorTextColor: '#10b981',
                                        anchorTextHoverColor: '#34d399',
                                    },
                                    space: {
                                        spaceSmall: '4px',
                                        spaceMedium: '8px',
                                        spaceLarge: '16px',
                                        labelBottomMargin: '6px',
                                        anchorBottomMargin: '4px',
                                        emailInputSpacing: '4px',
                                        socialAuthSpacing: '4px',
                                        buttonPadding: '12px 16px',
                                        inputPadding: '12px 16px',
                                    },
                                    fontSizes: {
                                        baseBodySize: '14px',
                                        baseInputSize: '14px',
                                        baseLabelSize: '13px',
                                        baseButtonSize: '14px',
                                    },
                                    fonts: {
                                        bodyFontFamily: 'Inter, system-ui, sans-serif',
                                        buttonFontFamily: 'Inter, system-ui, sans-serif',
                                        inputFontFamily: 'Inter, system-ui, sans-serif',
                                        labelFontFamily: 'Inter, system-ui, sans-serif',
                                    },
                                    borderWidths: {
                                        buttonBorderWidth: '1px',
                                        inputBorderWidth: '1px',
                                    },
                                    radii: {
                                        borderRadiusButton: '10px',
                                        buttonBorderRadius: '10px',
                                        inputBorderRadius: '10px',
                                    },
                                },
                            },
                            className: {
                                container: 'auth-container',
                                button: 'auth-button',
                                input: 'auth-input',
                                message: 'auth-message',
                            },
                        }}
                        localization={{
                            variables: {
                                sign_in: {
                                    email_label: 'Correo electrónico',
                                    password_label: 'Contraseña',
                                    email_input_placeholder: 'tu@email.com',
                                    password_input_placeholder: 'Tu contraseña',
                                    button_label: 'Iniciar Sesión',
                                    loading_button_label: 'Iniciando sesión...',
                                    link_text: '¿Ya tienes cuenta? Inicia sesión',
                                },
                                sign_up: {
                                    email_label: 'Correo electrónico',
                                    password_label: 'Contraseña',
                                    email_input_placeholder: 'tu@email.com',
                                    password_input_placeholder: 'Mínimo 6 caracteres',
                                    button_label: 'Crear Cuenta',
                                    loading_button_label: 'Creando cuenta...',
                                    link_text: '¿No tienes cuenta? Regístrate',
                                    confirmation_text: 'Revisa tu correo para confirmar tu cuenta',
                                },
                                forgotten_password: {
                                    email_label: 'Correo electrónico',
                                    password_label: 'Contraseña',
                                    email_input_placeholder: 'tu@email.com',
                                    button_label: 'Enviar instrucciones',
                                    loading_button_label: 'Enviando...',
                                    link_text: '¿Olvidaste tu contraseña?',
                                },
                            },
                        }}
                        providers={[]}
                        redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined}
                    />
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-500 mt-6">
                    Tus datos están protegidos con cifrado de extremo a extremo
                </p>
            </div>
        </div>
    );
}
