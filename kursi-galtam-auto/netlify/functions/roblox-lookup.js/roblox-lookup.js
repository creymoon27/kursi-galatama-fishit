exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'public, max-age=120'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const rawUsername = (event.queryStringParameters && event.queryStringParameters.u)
    ? String(event.queryStringParameters.u).trim()
    : '';

  if (!rawUsername) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: 'Username kosong' })
    };
  }

  try {
    const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        usernames: [rawUsername],
        excludeBannedUsers: false
      })
    });

    if (!userRes.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ ok: false, error: 'Gagal menghubungi Roblox Users API' })
      };
    }

    const userData = await userRes.json();
    const matched = (userData && Array.isArray(userData.data) && userData.data.length > 0)
      ? userData.data[0]
      : null;

    if (!matched || !matched.id) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ ok: false, error: 'Username Roblox tidak ditemukan' })
      };
    }

    const userId = matched.id;
    const displayName = matched.displayName || matched.name || rawUsername;
    const username = matched.name || rawUsername;

    const thumbUrl =
      'https://thumbnails.roblox.com/v1/users/avatar' +
      '?userIds=' + encodeURIComponent(userId) +
      '&size=420x420&format=Png&isCircular=false' +
      '&userIds=' + encodeURIComponent(userId);

    const headUrl =
      'https://thumbnails.roblox.com/v1/users/avatar-headshot' +
      '?userIds=' + encodeURIComponent(userId) +
      '&size=150x150&format=Png&isCircular=false';

    const [fullRes, headRes] = await Promise.all([
      fetch(
        'https://thumbnails.roblox.com/v1/users/avatar?userIds=' +
          encodeURIComponent(userId) +
          '&size=420x420&format=Png&isCircular=false'
      ),
      fetch(headUrl)
    ]);

    let fullBodyUrl = '';
    let avatarUrl = '';

    if (fullRes.ok) {
      const fullJson = await fullRes.json();
      if (fullJson && Array.isArray(fullJson.data) && fullJson.data[0] && fullJson.data[0].imageUrl) {
        fullBodyUrl = fullJson.data[0].imageUrl;
      }
    }

    if (headRes.ok) {
      const headJson = await headRes.json();
      if (headJson && Array.isArray(headJson.data) && headJson.data[0] && headJson.data[0].imageUrl) {
        avatarUrl = headJson.data[0].imageUrl;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        userId: userId,
        username: username,
        displayName: displayName,
        avatarUrl: avatarUrl || fullBodyUrl,
        fullBodyUrl: fullBodyUrl || avatarUrl
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err && err.message ? err.message : 'Server error' })
    };
  }
};