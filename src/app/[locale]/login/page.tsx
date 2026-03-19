"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, Sparkles, AlertCircle, ArrowRight, CheckCircle, XCircle } from "lucide-react";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

// Validation helpers
const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) return { valid: false };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "请输入有效的邮箱地址" };
  }
  return { valid: true };
};

const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push("至少8个字符");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("包含大写字母");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("包含小写字母");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("包含数字");
  }
  return { valid: errors.length === 0, errors };
};

const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone) return { valid: true }; // Phone is optional
  // Allow international formats
  const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: "请输入有效的手机号码" };
  }
  return { valid: true };
};

export default function LoginPage({ params }: LoginPageProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [emailExistsError, setEmailExistsError] = useState<string | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  
  // Validation state for register form
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  
  // Validation results
  const emailValidation = validateEmail(registerEmail);
  const passwordValidation = validatePassword(registerPassword);
  const phoneValidation = validatePhone(registerPhone);
  
  // Check if form is valid for submission
  const isRegisterFormValid = 
    registerEmail && 
    emailValidation.valid && 
    registerPassword && 
    passwordValidation.valid &&
    (!registerPhone || phoneValidation.valid);

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error("请填写邮箱和密码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "登录失败");
      }

      toast.success("登录成功");
      
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_timestamp', Date.now().toString());
      }
      
      window.location.href = `/${locale}`;
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailExistsError(null);
    
    // Validate all fields before submission
    if (!registerEmail || !emailValidation.valid) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    if (!registerPassword || !passwordValidation.valid) {
      toast.error("密码不符合要求：" + passwordValidation.errors.join("、"));
      return;
    }
    
    if (registerPhone && !phoneValidation.valid) {
      toast.error("请输入有效的手机号码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName || undefined,
          phone: registerPhone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Email already registered") {
          setEmailExistsError(registerEmail);
          toast.error("该邮箱已注册，请直接登录");
          return;
        }
        if (data.error === "This email is reserved.") {
          toast.error("此邮箱不可用于注册");
          return;
        }
        throw new Error(data.error || "注册失败");
      }

      toast.success("注册成功");
      
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_timestamp', Date.now().toString());
      }
      
      window.location.href = `/${locale}`;
    } catch (error) {
      console.error("Register error:", error);
      toast.error(error instanceof Error ? error.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    if (emailExistsError) {
      setLoginEmail(emailExistsError);
    }
    setEmailExistsError(null);
    setActiveTab("login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 safe-area-top">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
            <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            米格AI
          </h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">AI语音管理平台</p>
        </div>

        {/* Login/Register Card */}
        <Card className="shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="login" className="text-base">登录</TabsTrigger>
                <TabsTrigger value="register" className="text-base">注册</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">邮箱</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={loading}
                      className="h-12"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      className="h-12"
                      autoComplete="current-password"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    登录
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => router.push(`/${locale}/forgot-password`)}
                  >
                    忘记密码？
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4 pt-4">
                  {/* Email already exists error */}
                  {emailExistsError && (
                    <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        <p className="font-medium">该邮箱已注册</p>
                        <p className="text-sm mt-1">请直接使用此邮箱登录</p>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto mt-2 text-amber-700 dark:text-amber-300"
                          onClick={switchToLogin}
                        >
                          前往登录 <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-email">
                      邮箱 <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          setEmailExistsError(null);
                        }}
                        onBlur={() => setEmailTouched(true)}
                        disabled={loading}
                        className={`h-12 pr-10 ${
                          emailTouched && registerEmail && !emailValidation.valid
                            ? "border-destructive focus-visible:ring-destructive"
                            : emailTouched && registerEmail && emailValidation.valid
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                        }`}
                        autoComplete="email"
                      />
                      {emailTouched && registerEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailValidation.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    {emailTouched && registerEmail && !emailValidation.valid && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {emailValidation.error}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-password">
                      密码 <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        onBlur={() => setPasswordTouched(true)}
                        disabled={loading}
                        className={`h-12 ${
                          passwordTouched && registerPassword && !passwordValidation.valid
                            ? "border-destructive focus-visible:ring-destructive"
                            : passwordTouched && registerPassword && passwordValidation.valid
                            ? "border-green-500 focus-visible:ring-green-500"
                            : ""
                        }`}
                        autoComplete="new-password"
                      />
                      {passwordTouched && registerPassword && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {passwordValidation.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Password requirements */}
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">密码要求：</p>
                      <div className="grid grid-cols-2 gap-1">
                        <div className={`flex items-center gap-1 text-xs ${registerPassword.length >= 8 ? "text-green-600" : "text-muted-foreground"}`}>
                          {registerPassword.length >= 8 ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                          )}
                          至少8个字符
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${/[A-Z]/.test(registerPassword) ? "text-green-600" : "text-muted-foreground"}`}>
                          {/[A-Z]/.test(registerPassword) ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                          )}
                          包含大写字母
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${/[a-z]/.test(registerPassword) ? "text-green-600" : "text-muted-foreground"}`}>
                          {/[a-z]/.test(registerPassword) ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                          )}
                          包含小写字母
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${/[0-9]/.test(registerPassword) ? "text-green-600" : "text-muted-foreground"}`}>
                          {/[0-9]/.test(registerPassword) ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <span className="w-3 h-3 rounded-full border border-muted-foreground/30" />
                          )}
                          包含数字
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-name">姓名</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="您的姓名（选填）"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      disabled={loading}
                      className="h-12"
                      autoComplete="name"
                    />
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-phone">手机号</Label>
                    <div className="relative">
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+86 1xx xxxx xxxx（选填）"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        disabled={loading}
                        className={`h-12 ${
                          phoneTouched && registerPhone && !phoneValidation.valid
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                        autoComplete="tel"
                      />
                      {phoneTouched && registerPhone && !phoneValidation.valid && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <XCircle className="h-5 w-5 text-destructive" />
                        </div>
                      )}
                    </div>
                    {phoneTouched && registerPhone && !phoneValidation.valid && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {phoneValidation.error}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base" 
                    disabled={loading || !isRegisterFormValid}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    注册
                  </Button>
                  {!isRegisterFormValid && (registerEmail || registerPassword) && (
                    <p className="text-sm text-muted-foreground text-center">
                      请完善必填项（*）后再提交
                    </p>
                  )}
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          注册即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
