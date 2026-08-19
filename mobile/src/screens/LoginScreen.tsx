import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { loginUser, AuthUser } from '../services/auth';
import Icon from '../components/Icon';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  onNavigateToRegister: () => void;
}

const PRIMARY = '#0D9488';
const BG      = '#F8FAFC';

export default function LoginScreen({ onLoginSuccess, onNavigateToRegister }: LoginScreenProps) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password)     { setError('Please enter your password'); return; }

    setLoading(true);
    try {
      const user = await loginUser({ email: email.trim(), password });
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={st.logoArea}>
            <View style={st.logoCircle}>
              <Icon name="medical" size={44} color="#fff" />
            </View>
            <Text style={st.appName}>MediDispense</Text>
            <Text style={st.tagline}>Your smart medicine helper</Text>
          </View>

          <View style={st.card}>
            <Text style={st.heading}>Sign In</Text>
            <Text style={st.sub}>Enter your email and password</Text>

            {/* Email */}
            <Text style={st.label}>
              <Icon name="mail-outline" size={15} color="#64748B" />{'  '}Email Address
            </Text>
            <TextInput
              style={st.input}
              placeholder="you@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              accessibilityLabel="Email"
            />

            {/* Password */}
            <Text style={st.label}>
              <Icon name="lock-closed-outline" size={15} color="#64748B" />{'  '}Password
            </Text>
            <View style={st.passWrap}>
              <TextInput
                style={st.passInput}
                placeholder="Your password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                accessibilityLabel="Password"
              />
              <TouchableOpacity
                style={st.eyeBtn}
                onPress={() => setShowPassword(v => !v)}
                activeOpacity={0.7}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* Error */}
            {error && (
              <View style={st.errorBox}>
                <Icon name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={st.errorTxt}>{error}</Text>
              </View>
            )}

            {/* Login button */}
            <TouchableOpacity
              style={[st.loginBtn, loading && st.loginBtnBusy]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Icon name="log-in-outline" size={20} color="#fff" />
                    <Text style={st.loginBtnTxt}>Sign In</Text>
                  </>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={st.divider}>
              <View style={st.divLine} />
              <Text style={st.divTxt}>New user?</Text>
              <View style={st.divLine} />
            </View>

            {/* Register link */}
            <TouchableOpacity
              style={st.registerBtn}
              onPress={onNavigateToRegister}
              activeOpacity={0.8}
            >
              <Icon name="person-add-outline" size={20} color={PRIMARY} />
              <Text style={st.registerTxt}>Create New Account</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 32 },

  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  appName:  { fontSize: 28, fontWeight: '900', color: '#0F172A' },
  tagline:  { fontSize: 15, color: '#64748B', marginTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 5,
  },
  heading: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  sub:     { fontSize: 14, color: '#64748B', marginBottom: 24 },

  label:   { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  input:   {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  passWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  passInput:{ flex: 1, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: '#0F172A' },
  eyeBtn:   { paddingHorizontal: 16, paddingVertical: 16 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginTop: 14,
  },
  errorTxt: { flex: 1, fontSize: 14, color: '#DC2626', fontWeight: '500' },

  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 18, marginTop: 24,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginBtnBusy:{ opacity: 0.7 },
  loginBtnTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },

  divider:  {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20,
  },
  divLine:  { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  divTxt:   { fontSize: 13, color: '#94A3B8', fontWeight: '500' },

  registerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 2, borderColor: PRIMARY, borderRadius: 14, paddingVertical: 16,
  },
  registerTxt: { fontSize: 16, fontWeight: '700', color: PRIMARY },
});
