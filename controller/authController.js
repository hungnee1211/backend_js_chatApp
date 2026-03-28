// controllers/authController.js
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../model/user.js';

const ACCESS_TOKEN_TTL = '1h';
const ACCESS_COOKIE_MAXAGE = 60 * 60 * 1000; // Phải là 10 giây (10,000ms)

const REFRESH_TOKEN_TTL = '14d';
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
  console.log("Giờ hiện tại của Server:", new Date().toString());
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
      secure: false,
      maxAge: ACCESS_COOKIE_MAXAGE, // Dùng maxAge thay vì expires
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions(isProduction),
      secure: false,
      maxAge: REFRESH_COOKIE_MAXAGE, // Dùng maxAge thay vì expires
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

export const RefreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Không có Refresh Token' });
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_KEY || process.env.SECRET_TOKEN_KEY, (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Refresh Token hết hạn' });
      }

      const newAccessToken = jwt.sign(
        { userId: decoded.userId },
        process.env.SECRET_TOKEN_KEY,
        { expiresIn: '10s' } // Để 10s test cho nhanh
      );

      res.cookie('accessToken', newAccessToken, {
        ...cookieOptions(isProduction),
        secure: false, // Thêm dòng này giống SignIn để test Localhost
        maxAge: ACCESS_COOKIE_MAXAGE, // KHÔNG GHI 10 * 1000 NỮA, HÃY DÙNG BIẾN CHUẨN (60s)
      });

      return res.status(200).json({ message: 'Auto Refresh thành công' });
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server' });
  }
};