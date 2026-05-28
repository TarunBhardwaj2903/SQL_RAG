# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of SQL RAG seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do Not Disclose Publicly

Please do not open a public GitHub issue for security vulnerabilities.

### 2. Report Privately

Send an email to: [your-email@example.com] with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Best effort

## Security Best Practices

### For Users

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique passwords
   - Rotate API keys regularly
   - Use read-only database users in production

2. **API Keys**
   - Store securely (use secret managers in production)
   - Enable 2FA on all accounts
   - Monitor API usage for anomalies
   - Revoke unused keys immediately

3. **Database Access**
   - Use read-only PostgreSQL user
   - Enable SSL/TLS connections
   - Whitelist IP addresses
   - Enable audit logging

4. **Network Security**
   - Use HTTPS in production
   - Configure CORS properly
   - Enable rate limiting
   - Use firewall rules

### For Developers

1. **Code Security**
   - Never hardcode secrets
   - Validate all user inputs
   - Use parameterized queries
   - Sanitize error messages

2. **Dependencies**
   - Run `npm audit` regularly
   - Run `safety check` for Python
   - Keep dependencies updated
   - Review dependency licenses

3. **Testing**
   - Test SQL injection prevention
   - Test rate limiting
   - Test input validation
   - Test error handling

## Known Security Features

### ✅ Implemented

- Read-only SQL enforcement
- Input validation (5-500 characters)
- SQL keyword blocking (DROP, DELETE, etc.)
- Dangerous pattern detection
- Error message sanitization
- CORS configuration
- Environment variable isolation

### 🔄 Recommended (Not Implemented)

- Rate limiting per IP
- API key authentication
- Request logging
- Intrusion detection
- DDoS protection
- Web Application Firewall (WAF)

## Security Checklist for Production

- [ ] Use read-only database user
- [ ] Enable SSL/TLS for database connections
- [ ] Configure CORS to specific domains
- [ ] Implement rate limiting
- [ ] Add API key authentication
- [ ] Enable request logging
- [ ] Set up monitoring and alerts
- [ ] Use secret manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] Enable database audit logging
- [ ] Configure firewall rules
- [ ] Use HTTPS only
- [ ] Implement IP whitelisting
- [ ] Set up intrusion detection
- [ ] Regular security audits
- [ ] Dependency scanning in CI/CD

## Common Vulnerabilities and Mitigations

### SQL Injection

**Mitigation:**
- All queries use parameterized statements
- SQL guard validates queries before execution
- Dangerous keywords are blocked

### API Abuse

**Mitigation:**
- Input validation limits query length
- Recommended: Implement rate limiting
- Recommended: Add API key authentication

### Data Exposure

**Mitigation:**
- Read-only database access
- Error messages don't expose sensitive data
- Recommended: Add row-level security

### Credential Theft

**Mitigation:**
- `.env` files excluded from git
- Recommended: Use secret managers
- Recommended: Rotate keys regularly

## Incident Response

If a security incident occurs:

1. **Immediate Actions**
   - Rotate all compromised credentials
   - Review access logs
   - Identify scope of breach
   - Contain the incident

2. **Investigation**
   - Determine root cause
   - Assess impact
   - Document timeline
   - Preserve evidence

3. **Remediation**
   - Apply security patches
   - Update affected systems
   - Enhance monitoring
   - Implement preventive measures

4. **Communication**
   - Notify affected users
   - Provide status updates
   - Share lessons learned
   - Update security documentation

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Acknowledgments

We appreciate the security research community's efforts in keeping this project secure. Responsible disclosure is greatly appreciated.

---

**Last Updated:** May 28, 2026
