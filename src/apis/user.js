import request from '@/utils/request';

export function getCurrentInvitationCode(data) {
  return request({
    url: '/api/v1/inviteFriends',
    method: "post",
    data: data,
  });
}

export function bindInvitationCode(data) {
  return request({
    url: '/api/superior',
    method: "post",
    data: data,
  });
}

export function heartbeat(data) {
  return request({
    url: '/api/v1/device/heartbeat',
    method: "post",
    data: data,
  });
}