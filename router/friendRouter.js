import express from "express"
import { 
    sendFriend 
    ,acceptFriendRequest
    , declineFriendRequest 
    , getAllListFriend ,
     getListFriendRequest 
} from "../controller/friendController.js"

const router = express.Router()

router.post("/request" , sendFriend)
router.post("/request/:requestId/accept" , acceptFriendRequest)
router.post("/request/:requestId/decline" , declineFriendRequest)
router.get("/request" , getListFriendRequest)
router.get("/" , getAllListFriend)


export default router