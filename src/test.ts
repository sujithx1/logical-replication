import { UserSchema } from "@magadhtech/mds-schema"
import { pdb } from "./db/db"
import { eq } from "drizzle-orm"



export const insertUser = async () => {


  await pdb.insert(UserSchema).values
  ({
    name:'sujith-32',
    phone:'1111111123',

  })

  console.log("user inserted")
}

insertUser().catch(console.error)






// export const deleteUser = async () => {
//   await pdb.delete(UserSchema).where(eq(UserSchema.name,'sujith-32')).returning()
//   console.log("user deleted")
// }

// await deleteUser()