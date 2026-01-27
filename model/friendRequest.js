import mongoose from "mongoose";


const friendRequestSchema = new mongoose.Schema({
    from:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,

    },
    to:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    message:{
        type:String,
        trim:true,
        maxlength:300
    }
} , {
    timestamps:true
})

//them index k cho gui nhieu request
friendRequestSchema.index({from:1 , to:1} , {unique:true})

friendRequestSchema.index({from:1})
friendRequestSchema.index({to:1})

const friendRequest = mongoose.model("friendRequest" , friendRequestSchema)
export default friendRequest