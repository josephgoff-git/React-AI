export const blob_base_url = "https://aws1-bucket1-jg.s3.amazonaws.com/reactaiplayground/"

let local = false
let server = "http://localhost:8080"
// if (!local) {server = "https://reactaiplayground.azurewebsites.net"}
// if (!local) {server = "https://store.expertsoncall.online"} 
if (!local) {server = "https://combined-project-server.up.railway.app"}

export default server