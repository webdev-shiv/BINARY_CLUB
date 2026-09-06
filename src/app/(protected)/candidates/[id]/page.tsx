import {redirect} from "next/navigation"; export default async function Candidate({params}:{params:Promise<{id:string}>}){const {id}=await params;redirect(`/evaluation/${id}`)}
