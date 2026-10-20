# Security

Report suspected vulnerabilities privately to mark@midsizeai.com. Include the affected URL or file and a minimal reproduction. Do not send secrets or customer records or publish working exploits in public issues.

Credentials belong in deployment environment variables, never in client bundles or committed files. Revoke and replace any confirmed leaked key; ignore rules do not erase Git history.

CodeQL and CI scan pull requests and main. Dependabot proposes reviewed updates. These checks reduce risk and do not certify that an application is secure. Origin checks are browser controls, not authentication; application memory limits are not distributed quotas.

Before production release, review the security handoff in docs, check provider quotas and Vercel rate limits, and verify account 2FA, collaborator/app access, secret push protection and protected branches. These account settings are not managed by this patch.
