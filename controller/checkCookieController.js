// controllers/checkCookie.controller.js
const checkCookie = (req, res) => {
  console.log("Cookies nhận được:", req.cookies)

  const token = req.cookies.token

    console.log("Refresh token:", req.cookies.refreshToken)
    console.log("Access token:", req.cookies.accessToken)
    console.log(res.cookies)


  res.json({
    success: true,
    token: token || null,
    
  })
}



export {checkCookie} 
