import User from '../model/user.js'

const getUser = async (req , res) => {
    try {
       const users = await User.find().select('id username displayName')

       return res.status(200).json(users)
    } catch (error) {
        console.log("Loi fetch user" , error)
        return res.status(403).json({message:"Loi lay du lieu user"})
    }
}


const getUserDetail = async (req , res) => {
    try {
       const userId = req.user._id
       const users = await User.findById(userId).select('id username displayName avatarUrl')

       return res.status(200).json(users)
    } catch (error) {
        console.log("Loi fetch user" , error)
        return res.status(403).json({message:"Loi lay du lieu user"})
    }
}


const getUsersByKeyword = async (req, res) => {
    try {
        const { keyword } = req.query

        if (!keyword)
            return res.status(400).json({ message: "Thiếu keyword" })

        const users = await User.find({
            $or: [
                { username: { $regex: keyword, $options: "i" } }, // tach keyword da gui thanh cum key search theo option tai i
                { displayName: { $regex: keyword, $options: "i" } }
            ]
        }).select('_id username displayName avatarUrl')

        return res.status(200).json(users)

    } catch (error) {
        console.log("Lỗi tìm user:", error)
        return res.status(500).json({ message: "Lỗi server" })
    }
}


const updateUser = async (req, res) => {
  try {
    const userId = req.user._id

    const { firstName, lastName } = req.body

    const updateData = {}

    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName

   
    if (firstName || lastName) {
      const user = await User.findById(userId)

      const newFirstName = firstName || user.firstName
      const newLastName = lastName || user.lastName

      updateData.displayName = `${newFirstName} ${newLastName}`
    }

    if (req.file) {
      updateData.avatarUrl = `/uploads/${req.file.filename}`
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("_id username firstName lastName displayName avatarUrl")

    return res.status(200).json(updatedUser)

  } catch (error) {
    console.log("Lỗi update user:", error)
    return res.status(500).json({ message: "Lỗi server" })
  }
}


export {getUser , getUserDetail , getUsersByKeyword , updateUser}