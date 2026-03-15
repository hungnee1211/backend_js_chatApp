// controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../model/user.js';

const ACCESS_TOKEN_TTL = '40m';
const REFRESH_TOKEN_TTL = '14d';

const ACCESS_COOKIE_MAXAGE = 40 * 60 * 1000;
const REFRESH_COOKIE_MAXAGE = 14 * 24 * 60 * 60 * 1000;

const cookieOptions = (isProduction) => ({
  httpOnly: true,
  secure: isProduction,           
  sameSite: 'lax',
  path: '/',
});

export const SignUp = async (req, res) => {
  try {
    const { username, password, firstName, lastName } = req.body;

    if (!username || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Không thể để thiếu thông tin' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username đã tồn tại' });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      password: hashPassword,
      displayName: `${firstName} ${lastName}`,
    });

    return res.status(201).json({
      message: 'Đăng ký thành công',
      user: {
        id: newUser._id,
        username: newUser.username,
        displayName: newUser.displayName,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

export const SignIn = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Thiếu username hoặc password' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Không tìm thấy user' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Sai mật khẩu' });
    }

    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.SECRET_TOKEN_KEY,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_KEY || process.env.SECRET_TOKEN_KEY, // fallback nếu chưa có key riêng
      { expiresIn: REFRESH_TOKEN_TTL }
    );

    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('accessToken', accessToken, {
      ...cookieOptions(isProduction),
      maxAge: ACCESS_COOKIE_MAXAGE,
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions(isProduction),
      maxAge: REFRESH_COOKIE_MAXAGE,
    });

    return res.status(200).json({
      message: 'Đăng nhập thành công',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Lỗi server' });
  }
};

export const SignOut = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('accessToken', cookieOptions(isProduction));
  res.clearCookie('refreshToken', cookieOptions(isProduction));

  return res.status(200).json({ message: 'Đăng xuất thành công' });
};