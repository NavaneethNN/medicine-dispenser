import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { registerUser, AuthUser } from '../services/auth';
import Icon from '../components/Icon';

interface SignupScreenProps {
  onRegisterSuccess: (user: AuthUser) => void;
  onNavigateToLogin: () => void;
}

const PRIMARY = '#0D9488';

export default function SignupScreen({ onRegisterSuccess, onNavigateToLogin }: SignupScreenProps) {
  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPass, setShowPass]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);
    if (!name.trim())              { setError('Please enter your name'); return; }
    if (!email.trim())             { setError('Please enter your email'); return; }
    if (password.length < 6)       { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm)      { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const user = await registerUser({ name: name.trim(), email: email.trim(), password });
      onRegisterSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <Text style={st.heading}>Create Account</Text>
            <Text style={st.sub}>Fill in the details below to get started</Text>

            {/* Name */}
            <Text style={st.label}><Icon name="person-outline" size={15} color="#64748B" />{'  '}Your Name</Text>
            <TextInput
              style={st.input}
              placeholder="e.g. Ravi Kumar"
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Full Name"
            />

            {/* Email */}
            <Text style={st.label}><Icon name="mail-outline" size={15} color="#64748B" />{'  '}Email Address</Text>
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
            <Text style={st.label}><Icon name="lock-closed-outline" size={15} color="#64748B" />{'  '}Password (min 6 letters)</Text>
            <View style={st.passWrap}>
              <TextInput
                style={st.passInput}
                placeholder="Choose a password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
                accessibilityLabel="Password"
              />
              <TouchableOpacity style={st.eyeBtn} onPress={() => setShowPass(v => !v)} activeOpacity={0.7}>
                <Icon name={showPass ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Confirm */}
            <Text style={st.label}><Icon name="shield-checkmark-outline" size={15} color="#64748B" />{'  '}Repeat Password</Text>
            <TextInput
            style={[
                st.input,
                confirm && confirm !== password ? st.inputError : null,
                confirm && confirm === password ? st.inputOk : null,
              ]}
              placeholder="Same password again"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPass}
              value={confirm}
              onChangeText={setConfirm}
              accessibilityLabel="Confirm Password"
            />
            {confirm.length > 0 && confirm === password && (
              <View style={st.matchRow}>
                <Icon name="checkmark-circle-outline" size={15} color="#059669" />
                <Text style={st.matchTxt}>Passwords match</Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={st.errorBox}>
                <Icon name="alert-circle-outline" size={18} color="#DC2626" />
                <Text style={st.errorTxt}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[st.createBtn, loading && st.createBtnBusy]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Icon name="person-add-outline" size={20} color="#fff" />
                    <Text style={st.createBtnTxt}>Create Account</Text>
                  </>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={st.divider}>
              <View style={st.divLine} />
              <Text style={st.divTxt}>Already have an account?</Text>
              <View style={st.divLine} />
            </View>

            <TouchableOpacity
              style={st.loginBtn}
              onPress={onNavigateToLogin}
              activeOpacity={0.8}
            >
              <Icon name="log-in-outline" size={20} color={PRIMARY} />
              <Text style={st.loginBtnTxt}>Sign In Instead</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8FAFC' },
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
    marginBottom: 32,
  },
  heading: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  sub:     { fontSize: 14, color: '#64748B', marginBottom: 24 },

  label:   { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  input:   {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  inputError: { borderColor: '#FCA5A5' },
  inputOk:    { borderColor: '#6EE7B7' },
  passWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    backgroundColor: '#F8FAFC',
  },
  passInput:{ flex: 1, paddingHorizontal: 18, paddingVertical: 16, fontSize: 16, color: '#0F172A' },
  eyeBtn:   { paddingHorizontal: 16, paddingVertical: 16 },

  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  matchTxt: { fontSize: 13, color: '#059669', fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginTop: 14,
  },
  errorTxt: { flex: 1, fontSize: 14, color: '#DC2626', fontWeight: '500' },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PRIMARY, borderRadius: 14, paddingVertical: 18, marginTop: 24,
    shadowColor: PRIMARY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  createBtnBusy:{ opacity: 0.7 },
  createBtnTxt: { fontSize: 18, fontWeight: '800', color: '#fff' },

  divider:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divLine:  { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  divTxt:   { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 2, borderColor: PRIMARY, borderRadius: 14, paddingVertical: 16,
  },
  loginBtnTxt: { fontSize: 16, fontWeight: '700', color: PRIMARY },
});
