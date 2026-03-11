import nodemailer from 'nodemailer';

// Email configuration
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@migeai.com';

// Create transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: SMTP_USER && SMTP_PASS ? {
      user: SMTP_USER,
      pass: SMTP_PASS,
    } : undefined,
  });
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  locale: string = 'zh'
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5000';
  const resetUrl = `${baseUrl}/${locale}/reset-password?token=${resetToken}`;
  
  const subjects: Record<string, string> = {
    zh: '米格AI - 重置密码',
    en: 'Mige AI - Reset Password',
    ja: 'Mige AI - パスワードリセット',
    es: 'Mige AI - Restablecer contraseña',
    fr: 'Mige AI - Réinitialiser le mot de passe',
    de: 'Mige AI - Passwort zurücksetzen',
    pt: 'Mige AI - Redefinir senha',
    ru: 'Mige AI - Сброс пароля',
    it: 'Mige AI - Reimposta password',
    ar: 'Mige AI - إعادة تعيين كلمة المرور',
    hi: 'Mige AI - पासवर्ड रीसेट करें',
  };

  const bodies: Record<string, string> = {
    zh: `
      <h2>重置您的密码</h2>
      <p>您好，</p>
      <p>我们收到了重置您密码的请求。请点击下面的链接来重置密码：</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">重置密码</a></p>
      <p>或者复制以下链接到浏览器：</p>
      <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
      <p>此链接将在 1 小时后过期。</p>
      <p>如果您没有请求重置密码，请忽略此邮件。</p>
      <br/>
      <p>米格AI 团队</p>
    `,
    en: `
      <h2>Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Click the link below to reset it:</p>
      <p><a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
      <p>Or copy this link to your browser:</p>
      <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request a password reset, please ignore this email.</p>
      <br/>
      <p>Mige AI Team</p>
    `,
  };

  try {
    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: `"Mige AI" <${EMAIL_FROM}>`,
      to: email,
      subject: subjects[locale] || subjects.en,
      html: bodies[locale] || bodies.en,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Send welcome email
export async function sendWelcomeEmail(
  email: string,
  name: string,
  locale: string = 'zh'
): Promise<boolean> {
  const subjects: Record<string, string> = {
    zh: '欢迎加入米格AI',
    en: 'Welcome to Mige AI',
    ja: 'Mige AIへようこそ',
    es: 'Bienvenido a Mige AI',
    fr: 'Bienvenue chez Mige AI',
    de: 'Willkommen bei Mige AI',
    pt: 'Bem-vindo ao Mige AI',
    ru: 'Добро пожаловать в Mige AI',
    it: 'Benvenuto in Mige AI',
    ar: 'مرحباً بك في Mige AI',
    hi: 'Mige AI में आपका स्वागत है',
  };

  const bodies: Record<string, string> = {
    zh: `
      <h2>欢迎加入米格AI！</h2>
      <p>亲爱的 ${name}，</p>
      <p>感谢您注册米格AI。您现在可以开始使用我们的AI语音服务了。</p>
      <p>如有任何问题，请随时联系我们的支持团队。</p>
      <br/>
      <p>米格AI 团队</p>
    `,
    en: `
      <h2>Welcome to Mige AI!</h2>
      <p>Dear ${name},</p>
      <p>Thank you for registering with Mige AI. You can now start using our AI voice services.</p>
      <p>If you have any questions, please feel free to contact our support team.</p>
      <br/>
      <p>Mige AI Team</p>
    `,
  };

  try {
    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: `"Mige AI" <${EMAIL_FROM}>`,
      to: email,
      subject: subjects[locale] || subjects.en,
      html: bodies[locale] || bodies.en,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}
