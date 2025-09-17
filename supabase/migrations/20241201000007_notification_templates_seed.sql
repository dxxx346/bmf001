-- Seed default notification templates
-- This migration adds default templates for all notification types and channels

-- Order confirmation email template
INSERT INTO notification_templates (name, type, channel, locale, subject_template, title_template, message_template, html_template, variables, is_active) VALUES 
('order_confirmation_email', 'order_confirmation', 'email', 'en', 
'Order Confirmation - {{data.order_id}}',
'Order Confirmed!',
'Your order {{data.order_id}} has been confirmed. Total: {{formatCurrency data.total_amount data.currency}}',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #16a34a; margin-bottom: 20px;">Order Confirmed!</h1>
  <p>Hi {{user.name}},</p>
  <p>Thank you for your order! Here are the details:</p>
  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0;">Order Details</h3>
    <p><strong>Order ID:</strong> {{data.order_id}}</p>
    <p><strong>Total:</strong> {{formatCurrency data.total_amount data.currency}}</p>
    <p><strong>Date:</strong> {{formatDate data.order_date}}</p>
    {{#if data.items}}
    <h4>Items:</h4>
    <ul>
      {{#each data.items}}
      <li>{{this.name}} - {{formatCurrency this.price ../data.currency}}</li>
      {{/each}}
    </ul>
    {{/if}}
  </div>
  <p>You will receive download links once payment is processed.</p>
  <p style="margin-top: 30px;">
    <a href="{{url "/orders/" data.order_id}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Order</a>
  </p>
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    Need help? <a href="{{url "/support"}}">Contact our support team</a><br>
    <a href="{{unsubscribeUrl}}">Unsubscribe</a> from order notifications
  </p>
</div>',
'{"order_id": "Order ID", "total_amount": "Total order amount", "currency": "Currency code", "order_date": "Order date", "items": "Array of order items"}',
true);

-- Payment received email template
INSERT INTO notification_templates (name, type, channel, locale, subject_template, title_template, message_template, html_template, variables, is_active) VALUES 
('payment_received_email', 'payment_received', 'email', 'en',
'Payment Received - {{formatCurrency data.amount data.currency}}',
'Payment Received!',
'Your payment of {{formatCurrency data.amount data.currency}} has been received and processed.',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #16a34a; margin-bottom: 20px;">Payment Received!</h1>
  <p>Hi {{user.name}},</p>
  <p>Your payment has been successfully processed.</p>
  <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
    <h3 style="margin-top: 0; color: #16a34a;">Payment Details</h3>
    <p><strong>Amount:</strong> {{formatCurrency data.amount data.currency}}</p>
    <p><strong>Method:</strong> {{capitalize data.payment_method}}</p>
    <p><strong>Transaction ID:</strong> {{data.transaction_id}}</p>
    <p><strong>Date:</strong> {{formatDate data.payment_date}}</p>
  </div>
  {{#if data.download_links}}
  <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #2563eb;">Your Downloads</h3>
    <p>Your digital products are now available for download:</p>
    <ul>
      {{#each data.download_links}}
      <li><a href="{{this.url}}" style="color: #2563eb;">{{this.name}}</a></li>
      {{/each}}
    </ul>
  </div>
  {{/if}}
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    Keep this email for your records.<br>
    <a href="{{unsubscribeUrl}}">Unsubscribe</a> from payment notifications
  </p>
</div>',
'{"amount": "Payment amount", "currency": "Currency code", "payment_method": "Payment method", "transaction_id": "Transaction ID", "payment_date": "Payment date", "download_links": "Array of download links"}',
true);

-- Product purchased email template
INSERT INTO notification_templates (name, type, channel, locale, subject_template, title_template, message_template, html_template, variables, is_active) VALUES 
('product_purchased_email', 'product_purchased', 'email', 'en',
'Thank you for purchasing {{data.product_name}}!',
'Download Your Product',
'Thank you for purchasing {{data.product_name}}. Your download is ready!',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 20px;">Thank You for Your Purchase!</h1>
  <p>Hi {{user.name}},</p>
  <p>Your purchase of <strong>{{data.product_name}}</strong> is complete!</p>
  <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
    <h3 style="margin-top: 0;">Product Details</h3>
    <p><strong>Product:</strong> {{data.product_name}}</p>
    <p><strong>Price:</strong> {{formatCurrency data.price data.currency}}</p>
    <p><strong>Purchase Date:</strong> {{formatDate data.purchase_date}}</p>
    {{#if data.license_key}}
    <p><strong>License Key:</strong> <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px;">{{data.license_key}}</code></p>
    {{/if}}
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{data.download_url}}" style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Download Now</a>
  </div>
  <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
    <p style="margin: 0; color: #92400e;"><strong>Important:</strong> Save your download link! It will be available for {{data.download_expiry || "30 days"}}.</p>
  </div>
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    Need support? <a href="{{url "/support"}}">Contact us</a><br>
    <a href="{{unsubscribeUrl}}">Unsubscribe</a> from purchase notifications
  </p>
</div>',
'{"product_name": "Product name", "price": "Product price", "currency": "Currency code", "purchase_date": "Purchase date", "download_url": "Download link", "license_key": "License key if applicable", "download_expiry": "Download link expiry period"}',
true);

-- Security alert email template
INSERT INTO notification_templates (name, type, channel, locale, subject_template, title_template, message_template, html_template, variables, is_active) VALUES 
('security_alert_email', 'security_alert', 'email', 'en',
'Security Alert - {{data.alert_type}}',
'Security Alert',
'We detected suspicious activity on your account: {{data.alert_type}}',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #dc2626; margin-bottom: 20px;">🔒 Security Alert</h1>
  <p>Hi {{user.name}},</p>
  <p>We detected suspicious activity on your account and wanted to notify you immediately.</p>
  <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
    <h3 style="margin-top: 0; color: #dc2626;">Alert Details</h3>
    <p><strong>Alert Type:</strong> {{data.alert_type}}</p>
    <p><strong>Time:</strong> {{formatDate data.alert_time}}</p>
    <p><strong>Location:</strong> {{data.location || "Unknown"}}</p>
    <p><strong>IP Address:</strong> {{data.ip_address}}</p>
    {{#if data.user_agent}}
    <p><strong>Device:</strong> {{data.user_agent}}</p>
    {{/if}}
  </div>
  {{#ifEquals data.action_required true}}
  <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
    <h3 style="margin-top: 0; color: #d97706;">Action Required</h3>
    <p>{{data.action_description}}</p>
    <div style="text-align: center; margin: 20px 0;">
      <a href="{{data.action_url}}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Take Action</a>
    </div>
  </div>
  {{/ifEquals}}
  <p><strong>If this was you:</strong> No action is needed.</p>
  <p><strong>If this wasn\'t you:</strong> Please secure your account immediately by changing your password and reviewing your security settings.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{url "/security"}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Review Security Settings</a>
  </div>
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    This is an important security notification. We recommend keeping these alerts enabled.<br>
    <a href="{{url "/support"}}">Contact support</a> if you have concerns
  </p>
</div>',
'{"alert_type": "Type of security alert", "alert_time": "Time of alert", "location": "Geographic location", "ip_address": "IP address", "user_agent": "User agent string", "action_required": "Whether action is required", "action_description": "Description of required action", "action_url": "URL for action"}',
true);

-- Password reset email template
INSERT INTO notification_templates (name, type, channel, locale, subject_template, title_template, message_template, html_template, variables, is_active) VALUES 
('password_reset_email', 'password_reset', 'email', 'en',
'Reset Your Password',
'Password Reset Request',
'You requested to reset your password. Click the link to create a new password.',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb; margin-bottom: 20px;">Reset Your Password</h1>
  <p>Hi {{user.name}},</p>
  <p>You requested to reset your password for your account. Click the button below to create a new password:</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{data.reset_url}}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Reset Password</a>
  </div>
  <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
    <p style="margin: 0; color: #92400e;"><strong>Important:</strong> This link will expire in {{data.expiry_time || "1 hour"}}.</p>
  </div>
  <p>If you didn\'t request this password reset, please ignore this email. Your password will remain unchanged.</p>
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    For security reasons, this link can only be used once.<br>
    If you have trouble, <a href="{{url "/support"}}">contact our support team</a>
  </p>
</div>',
'{"reset_url": "Password reset URL", "expiry_time": "Link expiry time"}',
true);

-- Referral earned email template
INSERT INTO notification_templates (name, type, channel, locale, subject_template, title_template, message_template, html_template, variables, is_active) VALUES 
('referral_earned_email', 'referral_earned', 'email', 'en',
'You earned {{formatCurrency data.commission_amount data.currency}}!',
'Referral Commission Earned!',
'Congratulations! You earned {{formatCurrency data.commission_amount data.currency}} from a referral purchase.',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #16a34a; margin-bottom: 20px;">🎉 Commission Earned!</h1>
  <p>Hi {{user.name}},</p>
  <p>Great news! One of your referrals just made a purchase and you\'ve earned a commission.</p>
  <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
    <h3 style="margin-top: 0; color: #16a34a;">Commission Details</h3>
    <p><strong>Amount Earned:</strong> {{formatCurrency data.commission_amount data.currency}}</p>
    <p><strong>Commission Rate:</strong> {{data.commission_rate}}%</p>
    <p><strong>Product:</strong> {{data.product_name}}</p>
    <p><strong>Purchase Amount:</strong> {{formatCurrency data.purchase_amount data.currency}}</p>
    <p><strong>Date:</strong> {{formatDate data.commission_date}}</p>
  </div>
  <p>Your commission has been added to your account balance and will be included in your next payout.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{url "/dashboard/referrals"}}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Referral Dashboard</a>
  </div>
  <p>Keep sharing your referral links to earn more commissions!</p>
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    <a href="{{unsubscribeUrl}}">Unsubscribe</a> from referral notifications
  </p>
</div>',
'{"commission_amount": "Commission amount earned", "currency": "Currency code", "commission_rate": "Commission rate percentage", "product_name": "Product that was purchased", "purchase_amount": "Original purchase amount", "commission_date": "Date commission was earned"}',
true);

-- Marketing promotion email template
INSERT INTO notification_templates (name, type, channel, locale, subject_template, title_template, message_template, html_template, variables, is_active) VALUES 
('marketing_promotion_email', 'marketing_promotion', 'email', 'en',
'{{data.promotion_title}} - Save {{data.discount_amount}}{{#ifEquals data.discount_type "percentage"}}%{{/ifEquals}}!',
'Special Offer Just for You!',
'{{data.promotion_title}} - Save {{data.discount_amount}}{{#ifEquals data.discount_type "percentage"}}%{{/ifEquals}} on selected products.',
'<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px;">{{data.promotion_title}}</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">{{data.promotion_subtitle}}</p>
  </div>
  <p>Hi {{user.name}},</p>
  <p>{{data.promotion_description}}</p>
  <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; text-align: center; margin: 30px 0; border: 2px dashed #e2e8f0;">
    <div style="font-size: 36px; font-weight: bold; color: #dc2626; margin-bottom: 10px;">
      {{data.discount_amount}}{{#ifEquals data.discount_type "percentage"}}%{{/ifEquals}} OFF
    </div>
    <div style="font-size: 18px; color: #475569; margin-bottom: 20px;">
      Use code: <strong style="background-color: #fef3c7; padding: 8px 12px; border-radius: 6px; color: #92400e;">{{data.promo_code}}</strong>
    </div>
    <a href="{{data.promotion_url}}" style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">Shop Now</a>
  </div>
  {{#if data.featured_products}}
  <div style="margin: 30px 0;">
    <h3>Featured Products</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
      {{#each data.featured_products}}
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center;">
        {{#if this.image}}
        <img src="{{this.image}}" alt="{{this.name}}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">
        {{/if}}
        <h4 style="margin: 10px 0;">{{this.name}}</h4>
        <p style="color: #64748b; margin: 5px 0;">{{formatCurrency this.price ../data.currency}}</p>
        <a href="{{this.url}}" style="color: #2563eb; text-decoration: none; font-weight: bold;">View Product →</a>
      </div>
      {{/each}}
    </div>
  </div>
  {{/if}}
  <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
    <p style="margin: 0; color: #7f1d1d;"><strong>Limited Time:</strong> This offer expires {{formatDate data.expiry_date}}!</p>
  </div>
  <p style="margin-top: 30px; font-size: 12px; color: #666;">
    <a href="{{unsubscribeUrl}}">Unsubscribe</a> from promotional emails
  </p>
</div>',
'{"promotion_title": "Promotion title", "promotion_subtitle": "Promotion subtitle", "promotion_description": "Promotion description", "discount_amount": "Discount amount", "discount_type": "percentage or fixed", "promo_code": "Promotional code", "promotion_url": "Link to promotion", "featured_products": "Array of featured products", "expiry_date": "Promotion expiry date"}',
true);

-- In-app notification templates
INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('order_confirmation_in_app', 'order_confirmation', 'in_app', 'en',
'Order confirmed: {{data.order_id}}',
'Your order has been confirmed and is being processed.',
'{"order_id": "Order ID"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('payment_received_in_app', 'payment_received', 'in_app', 'en',
'Payment received',
'Payment of {{formatCurrency data.amount data.currency}} received successfully.',
'{"amount": "Payment amount", "currency": "Currency code"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('product_purchased_in_app', 'product_purchased', 'in_app', 'en',
'Product ready for download',
'{{data.product_name}} is ready for download.',
'{"product_name": "Product name"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('security_alert_in_app', 'security_alert', 'in_app', 'en',
'Security alert',
'Suspicious activity detected: {{data.alert_type}}',
'{"alert_type": "Type of security alert"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('referral_earned_in_app', 'referral_earned', 'in_app', 'en',
'Commission earned!',
'You earned {{formatCurrency data.commission_amount data.currency}} from a referral.',
'{"commission_amount": "Commission amount", "currency": "Currency code"}',
true);

-- SMS templates (shorter content)
INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('security_alert_sms', 'security_alert', 'sms', 'en',
'Security Alert',
'Security alert: {{data.alert_type}} detected on your account at {{formatDate data.alert_time}}. If this wasn\'t you, secure your account immediately: {{data.action_url}}',
'{"alert_type": "Type of alert", "alert_time": "Alert time", "action_url": "Action URL"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('payment_failed_sms', 'payment_failed', 'sms', 'en',
'Payment Failed',
'Payment of {{formatCurrency data.amount data.currency}} failed. Reason: {{data.failure_reason}}. Please update your payment method: {{data.update_url}}',
'{"amount": "Payment amount", "currency": "Currency", "failure_reason": "Failure reason", "update_url": "Update payment URL"}',
true);

-- Push notification templates
INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('order_confirmation_push', 'order_confirmation', 'push', 'en',
'Order Confirmed',
'Your order {{data.order_id}} has been confirmed!',
'{"order_id": "Order ID"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('payment_received_push', 'payment_received', 'push', 'en',
'Payment Received',
'Payment of {{formatCurrency data.amount data.currency}} received successfully.',
'{"amount": "Payment amount", "currency": "Currency code"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('product_purchased_push', 'product_purchased', 'push', 'en',
'Download Ready',
'{{data.product_name}} is ready for download!',
'{"product_name": "Product name"}',
true);

INSERT INTO notification_templates (name, type, channel, locale, title_template, message_template, variables, is_active) VALUES 
('referral_earned_push', 'referral_earned', 'push', 'en',
'Commission Earned!',
'You earned {{formatCurrency data.commission_amount data.currency}}!',
'{"commission_amount": "Commission amount", "currency": "Currency code"}',
true);
