import mongoose from "mongoose";

export default function ConnectDB() {

    mongoose.connect(process.env.DATABASE_CONNECT_STRING )
        .then(() => {
            console.log("Connect database success")
        })

        .catch((error)=> {
              console.error("Connect database fail", error)
            })
}
