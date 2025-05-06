const clientId = "a248a13da1d245c6a2d576d6809e3c88";
const params = new URLSearchParams(window.location.search); //???
const code = params.get('code');
const uri = "http://127.0.0.1:5173/"; //TODO: figure out why this isn't the usual /callback URL??? the port number was fixed in settings.json and the spotify API
//const refreshCode = l;
var profile;
var playlists;
var tracks;
var artists;
var accessToken = await initializeToken();
async function initializeToken() {
    if (!code) { //if we don't have an access code, then redirect to grant access
        redirectToAuthCodeFlow(clientId);
    } else { //if we already got access during this session, then 
        var token = await getAccessToken(clientId, code);
    }
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
    params.append("redirect_uri", uri);
    params.append("scope", "user-read-private user-read-email playlist-read-private user-top-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);
    params.append("show_dialog", false);
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
    params.append("redirect_uri", uri);
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
    console.log(result);
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

//gets top track information
async function fetchTracks(token) {
    const result = await fetch("https://api.spotify.com/v1/me/top/tracks/", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    const jsonRes = await result.json();
    if (!jsonRes) { throw new Error("JSON response doesn't exist"); }
    console.log(jsonRes);
    return jsonRes;
}

async function fetchArtists(token){
    const result = await fetch("https://api.spotify.com/v1/me/top/artists/", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });
    const jsonRes = await result.json();
    if (!jsonRes) { throw new Error("JSON response doesn't exist"); }
    console.log(jsonRes);
    return jsonRes;
}

export async function loadUserInfo() {
    if (!accessToken) { //regenerates the access token if it can't find it
        accessToken = await initializeToken();
    }

    if (!profile) {
        console.log("grabbing profile info");
        profile = await fetchProfile(accessToken);
    }

    populateUI(profile);

}

export async function loadPlaylistInfo() {
    if (!accessToken) { //regenerates the access token if it can't find it
        accessToken = await initializeToken();
    }
    if (!playlists) {
        playlists = await fetchPlaylists(accessToken);
    }
    populatePlaylists(playlists);
}

export async function loadTrackInfo() {
    if (!accessToken) { //regenerates the access token if it can't find it
        accessToken = await initializeToken();
    }
    if (!tracks) {
        tracks = await fetchTracks(accessToken);
    }
    populateTracks(tracks);
}

export async function loadArtistInfo() {
    if (!accessToken) { //regenerates the access token if it can't find it
        accessToken = await initializeToken();
    }
    if (!artists) {
        artists = await fetchArtists(accessToken);
    }
    populateTopArtists(artists);
}
//populates the information on the website with the info we found thru the async stuff... again postPlaylists should be more modular
async function populateUI(profile) {
    console.log(profile);
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

async function populatePlaylists(playlists) {
    const titles = playlists.items
        .filter(item => item !== null && item.name) //filters out deleted playlists and no-named playlists
        .map(item => item.name); //creates the array of names

    const ol = document.getElementById("playlist"); //creates a new ordered list entry under the section "playlist" (found in playlist.html)
    const li = document.createElement("li");
    titles.forEach(name => {
        try {
            const li = document.createElement("li");
            li.style.marginLeft = "20px"; //indents
            li.style.listStyleType = "decimal"; //sets HTML bulleting to be numbered
            li.textContent = name;
            ol.appendChild(li);
        }
        catch (error) {
            console.log("text is " + li.textContent);
            console.error("Error:", error);
            return false;

        }
    });

    return true;
}

async function populateTracks(tracks) {
    const titles = tracks.items
        .filter(item => item !== null && item.name) //has a name and exists
        .map(item => item.name); //creates array

    const ol = document.getElementById("track"); //creates new list under "track" (from track.html)
    titles.forEach(name => {
        try {
            const li = document.createElement("li");
            li.style.marginLeft = "20px"; //indents
            li.style.listStyleType = "decimal"; //sets HTML bulleting to be numbered
            li.textContent = name;
            ol.appendChild(li);
        }
        catch (error) {
            console.log("text is " + li.textContent);
            console.error("Error:", error);
            return false;

        }
    });
    return true;
}

async function populateTopArtists(artists) {
    const elements = artists.items
        .filter(item => item !== null && item.name) //has a name and exists
        .map(item => item.name); //creates array

    const ol = document.getElementById("top-artists"); //creates new list under "track" (from track.html)
    elements.forEach(name => {
        try {
            const li = document.createElement("li");
            li.style.marginLeft = "20px"; //indents
            li.style.listStyleType = "decimal"; //sets HTML bulleting to be numbered
            li.textContent = name;
            ol.appendChild(li);
        }
        catch (error) {
            console.log("text is " + li.textContent);
            console.error("Error:", error);
            return false;

        }
    });
    return true;
}