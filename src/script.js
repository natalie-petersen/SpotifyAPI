const clientId = "a248a13da1d245c6a2d576d6809e3c88";
const params = new URLSearchParams(window.location.search); //???
const code = params.get('code');
//const refreshCode = l;
var profile;
var playlists;
var accessToken = await initializeToken();
console.log("the token is initialized as " + accessToken);
async function initializeToken() {
    console.log("code: "+code);
    if (!code) { //if we don't have an access code, then redirect to grant access
        redirectToAuthCodeFlow(clientId);
    } else { //if we already got access during this session, then 
        var token = await getAccessToken(clientId, code);
    }
    console.log("access token is just gotten and is " + token);
    return token;
}
async function refreshToken() {

}
//sends the user to the "auth" spotify page before redirecting back
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
    //params.append("show_dialog", false);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}
//generates a random string from possible chars
function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//hashes the code verifier using SHA-256 and returns base-64 representation
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
    console.log("access token created, its " + access_token);
    return access_token;
}
//gets profile information
async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    console.log(result);
    console.log("access token has been used and is " + accessToken);
    return await result.json();
}
//gets playlist information
async function fetchPlaylists(token) {
    const result = await fetch("https://api.spotify.com/v1/me/playlists", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    const jsonRes = await result.json();
    if (!jsonRes) { throw new Error("JSON response doesn't exist"); }

    return jsonRes;
}
async function populatePlaylists(playlists) {
    const titles = playlists.items
        .filter(item => item !== null && item.name) //filters out deleted playlists and no-named playlists
        .map(item => item.name); //creates the array of names

    const ol = document.getElementById("playlists"); //creates a new ordered list entry
    try {
        titles.forEach(name => {
            const li = document.createElement("li");
            li.textContent = name;
            li.style.marginLeft = "20px"; //indents
            li.style.listStyleType = "decimal"; //sets HTML bulleting to be numbered
            ol.appendChild(li);
        })
    } catch (error) {
        console.log("text is " + li.textContent);
        console.error("Error:", error);
        return false;
    }
    return true;
}
// async function toggleContent(){
//     document.getElementById("")
// }
export async function loadUserInfo() {
    if(!accessToken){
        accessToken = await initializeToken();
    }
    console.log('loading!!!');
    console.log('I can see the token see look:' + accessToken + "and code too" + code);
    profile = await fetchProfile(accessToken);
    //playlists = await fetchPlaylists(accessToken); //not used

    populateUI(profile, playlists);

}
//populates the information on the website with the info we found thru the async stuff... again postPlaylists should be more modular
async function populateUI(profile, playlists) {
    console.log(profile);
    console.log(playlists);
    document.getElementById("displayName").innerText = profile.display_name;
    if (profile.images[0]) { //if the image exists, show it
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id; //sets the id HTML field to the id field we found
    //document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);
    //populatePlaylists(playlists); //separate function to get playlist list
}
