import request from '/src/utils/request';

export function checkForUpdates(data) {
  return request({
    url: '/api/packageVersion',
    method: "get",
    params: data,
  });
}

export function fetchContractSetting() {
  return request({
    url: '/file/contract.json?t=' + Date.now(),
    method: "get",
    params: {},
  });
}