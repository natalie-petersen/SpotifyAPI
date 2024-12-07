const clientId = "a248a13da1d245c6a2d576d6809e3c88";
const params = new URLSearchParams(window.location.search); //???
const code = params.get("code");

if (!code) { //if we don't have an access code, then redirect to grant access
    redirectToAuthCodeFlow(clientId);
} else { //if we already got access during this session, then 
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    const playlists = await fetchPlaylists(accessToken); //not used
    console.log(profile);
    populateUI(profile);
}
//idk what this does 
async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email playlist-read-private");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}
//again idk what this does
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//I really dk what this does
async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
//gets API token
async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}
//gets profile information
async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    console.log(result.total);
    return await result.json();
}
//gets playlist TITLES and posts them to the website. should probably make modular
async function postPlaylists(token) {
    const result = await fetch("https://api.spotify.com/v1/me/playlists", { 
        method: "GET", headers: { Authorization: `Bearer ${token}`}
    });
    const jsonRes = await result.json();
    if(!jsonRes) {throw new Error("JSON response doesn't contain 'items'");}
    
    const titles = jsonRes.items
    .filter(item=>item !== null && item.name) //filters out deleted playlists and no-named playlists
    .map(item=>item.name); //creates the array of names
    
    console.log(titles);

    const ol = document.getElementById("playlists");
try{
    titles.forEach(name=> {
        const li = document.createElement("li");
        li.textContent = name;
        li.style.marginLeft = "20px";
        li.style.listStyleType = "decimal";
        ol.appendChild(li);
    })
}catch (error){
    console.log("text is " + li.textContent);
    console.error("Error:", error);
}
    return titles;
}
//populates the information on the website with the info we found thru the async stuff... again postPlaylists should be more modular
function populateUI(profile) {
    document.getElementById("displayName").innerText = profile.display_name;
    if (profile.images[0]) { //if there's no image, don't bother
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id; //sets the id HTML field to the id field we found
    // document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
    postPlaylists(accessToken); //separate function to get playlist list
}