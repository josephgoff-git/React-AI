export const blob_base_url = "https://aws1-bucket1-jg.s3.amazonaws.com/reactaiplayground/"

let local = true
let server = "http://localhost:3001"
// if (!local) {server = "https://reactaiplayground.azurewebsites.net"}
if (!local) {server = "https://store.expertsoncall.online"}

export default server