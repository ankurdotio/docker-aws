export const execute = async (req, res) => {
  try {
    // Fallback to empty object {} if req.body is undefined
    const { language, code, stdin } = req.body || {};

    if (!language || !code) {
      return res.status(400).json({
        error: true,
        message: "Missing required fields: language or code",
      });
    }
    const CLIENT_ID = process.env.CLIENT_ID;
    const CLIENT_SECRET = process.env.CLIENT_SECRET;

    console.log(language);
    console.log(code);
    console.log(stdin);
    console.log("calling jdoodle api ... ");
    console.log(CLIENT_ID);

    const response = await fetch("https://api.jdoodle.com/v1/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        script: code,
        language: language,
        stdin: stdin,
        versionIndex: "0",
      }),
    });

    const result = await response.json();
    //  const result = "till now ok";
    console.log(result);
    //  return res.status(200);

    return res.status(200).json({
      success: true,
      data: result.output || "",
      cpuTime: result.cpuTime,
      memory: result.memory,
      statusCode: result.statusCode,
    });
  } catch (err) {
    return res.status(500).json({
      error: true,
      message: err.message,
    });
  }
};
