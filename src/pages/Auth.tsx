import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Users } from 'lucide-react';
import { supabase } from '../supabase';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    setLoading(true);

    // Validate password length
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error: signInError, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Please check your email for the confirmation link.');
          } else {
            throw new Error('Invalid email or password. Please try again.');
          }
        }
        
        if (!data.user) {
          throw new Error('No user data returned');
        }
        
        // Navigate after successful login
        window.location.href = '/dashboard';
        return;
      } else {
        // Sign up the user
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + '/auth',
            data: {
              first_name: firstName,
              surname: surname,
              age: parseInt(age),
              gender: gender,
            }
          }
        });

        if (signUpError) {
          throw new Error('Failed to create account. Please try again.');
        }

        if (signUpData?.user) {
          // Show success message and prompt to check email
          setError('Account created successfully! Please check your email to confirm your account.');
          setEmail('');
          setPassword('');
          setFirstName('');
          setSurname('');
          setAge('');
          setGender('');
          setIsLogin(true);
        } else {
          throw new Error('Failed to create account. Please try again.');
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://raw.githubusercontent.com/stackblitz/stackblitz-images/main/medical-cubes-pattern.png"
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      {/* Left side - Illustration and Welcome Message */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-sm relative z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-white/50 backdrop-blur-sm z-0"></div>
        <div className="relative z-10 flex flex-col items-center">
          <img
            src="https://cdn.jsdelivr.net/npm/@healthcare-illustrations/general/general-04.svg"
            alt="Medical Illustration"
            className="w-full max-w-md mb-8"
          />
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to NeemaMed</h1>
            <p className="text-lg text-gray-600 max-w-md">
              Your trusted partner in healthcare. Experience personalized medical care with our state-of-the-art facilities.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-pink-600">NeemaMed</h2>
            <h3 className="mt-6 text-2xl font-bold text-gray-900">
              {isLogin ? 'Welcome Back!' : 'Join Our Healthcare Family'}
            </h3>
            <p className="mt-2 text-gray-600">
              {isLogin
                ? 'Sign in to access your medical records and appointments'
                : 'Create an account to start your healthcare journey with us'}
            </p>
          </div>

          {error && (
            <div className={`mt-4 border px-4 py-3 rounded-lg ${
              error.includes('successfully')
                ? 'bg-green-50 border-green-200 text-green-600'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {error}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleAuth}>
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <div className="relative">
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="John"
                      />
                      <User className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-1">
                      Surname
                    </label>
                    <div className="relative">
                      <input
                        id="surname"
                        name="surname"
                        type="text"
                        required
                        value={surname}
                        onChange={(e) => setSurname(e.target.value)}
                        className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Doe"
                      />
                      <User className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                      Age
                    </label>
                    <div className="relative">
                      <input
                        id="age"
                        name="age"
                        type="number"
                        required
                        min="0"
                        max="150"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                        placeholder="25"
                      />
                      <Users className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <div className="relative">
                      <select
                        id="gender"
                        name="gender"
                        required
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                      <Users className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  placeholder="you@example.com"
                />
                <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                  placeholder="••••••••"
                />
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
                <Lock className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-colors ${
                  loading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  isLogin ? 'Sign in' : 'Create Account'
                )}
              </button>
            </div>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setEmail('');
                  setPassword('');
                  setPasswordError('');
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                {isLogin ? 'New patient? Create an account' : 'Already have an account? Sign in'}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/employee"
                className="text-sm text-pink-600 hover:text-pink-500"
              >
                Staff Portal Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}