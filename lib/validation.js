export const categories = ['Hardware','Software','Network','Access','Other'];
export const priorities = ['Low','Medium','High','Critical'];
export const ticketStatuses = ['Open','In Progress','Resolved'];
export const assetTypes = ['Laptop','Desktop','Monitor','Printer','Phone','Other'];
export const assetStatuses = ['Active','Maintenance','Retired'];
export const id = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
export const text = (value, max = 100) => typeof value === 'string' ? value.trim().slice(0, max) : '';
export const choice = (value, choices) => choices.includes(value);
export const optionalId = value => value === '' || value === null || value === undefined ? null : id(value) ? Number(value) : NaN;
export const email = value => !value || (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 160);
export function checkTicket(data) {
  const title = text(data?.title, 160), requester = text(data?.requester, 100),
    description = text(data?.description, 3000), requester_email = text(data?.requester_email,160);
  if (!title || !requester || !description || !choice(data?.category,categories) || !choice(data?.priority,priorities) || !email(requester_email)) {
    return { error: 'Complete the issue, requester, description, category and priority with valid values.' };
  }
  const asset_id = optionalId(data?.asset_id);
  if (Number.isNaN(asset_id)) return { error: 'Invalid linked asset.' };
  return { value: { title, requester, requester_email: requester_email || null, description, category: data.category, priority: data.priority, asset_id } };
}
export function checkAsset(data) {
  const asset_tag = text(data?.asset_tag, 40).toUpperCase();
  const device_name = text(data?.device_name,120);
  const serial_number = text(data?.serial_number,100);
  const assigned_to = text(data?.assigned_to,100) || 'Unassigned';
  const location = text(data?.location,120) || 'Main office';
  const status = data?.status || 'Active';
  if (!asset_tag || !/^[A-Z0-9_-]{3,40}$/.test(asset_tag) || !device_name || !choice(data?.asset_type,assetTypes) || !choice(status,assetStatuses)) {
    return { error: 'Enter a unique asset tag (letters/numbers/dashes), a name and a valid type/status.' };
  }
  return { value: {asset_tag,device_name,serial_number: serial_number || null,assigned_to,location,asset_type:data.asset_type,status} };
}
