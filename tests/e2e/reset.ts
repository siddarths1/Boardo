import { PrismaClient } from "@prisma/client";
export async function resetTestOwner() {
 const value=process.env.BOARDO_TEST_DATABASE_URL;
 if(!value)throw Error("Test database required.");
 const url=new URL(value);if(!["localhost","127.0.0.1","postgres"].includes(url.hostname)||!url.pathname.endsWith("_test"))throw Error("Use an isolated local test database.");
 const db=new PrismaClient({datasourceUrl:value});
 try{const user=await db.user.findUnique({where:{email:"e2e@example.invalid"}});if(user){await db.project.deleteMany({where:{userId:user.id}});await db.user.delete({where:{id:user.id}});}}finally{await db.$disconnect();}
}
