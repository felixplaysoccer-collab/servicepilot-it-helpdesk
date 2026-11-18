-- Run AFTER schema.sql, and AFTER create-user. Run only on an empty database.
-- All identities and incidents below are fictional examples.
USE servicepilot;

INSERT INTO assets (asset_tag,device_name,asset_type,serial_number,assigned_to,location,status) VALUES
('LAP-101','Dell Latitude 5440','Laptop','EXAMPLE-101','Jordan Lee','Main Office','Active'),
('LAP-102','Lenovo ThinkPad T14','Laptop','EXAMPLE-102','Alex Rivera','Main Office','Active'),
('MON-203','Dell 27-inch Monitor','Monitor','EXAMPLE-203','Taylor Chen','North Wing','Active'),
('PRT-304','HP LaserJet Pro','Printer','EXAMPLE-304','Reception','Front Desk','Maintenance'),
('DSK-405','Dell OptiPlex 7010','Desktop','EXAMPLE-405','Unassigned','Storage','Retired');

INSERT INTO tickets(title,requester,requester_email,category,priority,status,description,asset_id,created_at,resolved_at) VALUES
('Laptop will not connect to Wi-Fi','Jordan Lee','jordan@example.test','Network','High','Open','Cannot connect to the office wireless network. Restarted the laptop, but the issue remains.',1,NOW()-INTERVAL 2 DAY,NULL),
('Password reset request','Alex Rivera','alex@example.test','Access','Medium','In Progress','Employee is locked out of their account and needs a reset.',2,NOW()-INTERVAL 1 DAY,NULL),
('Install second monitor','Taylor Chen','taylor@example.test','Hardware','Low','Resolved','Connect and configure an additional monitor at the desk.',3,NOW()-INTERVAL 5 DAY,NOW()-INTERVAL 3 DAY),
('Reception printer is offline','Morgan Ellis','morgan@example.test','Hardware','Medium','Open','Front desk printer reports it is offline on all workstations.',4,NOW()-INTERVAL 6 HOUR,NULL),
('Request approved software','Casey Park','casey@example.test','Software','Low','Resolved','Install the company-approved office application.',NULL,NOW()-INTERVAL 7 DAY,NOW()-INTERVAL 4 DAY);

INSERT INTO ticket_activity (ticket_id,user_id,action,description)
SELECT id,NULL,'created','Imported sample request for demonstration' FROM tickets;
