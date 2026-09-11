import { describe, expect, it } from "vitest";
import { iconCandidates, isPublicAddress } from "./favicon";

describe("favicon", () => {
  it("refuses private, loopback and link-local addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.1",
      "192.168.1.1",
      "169.254.169.254",
      "0.0.0.0",
      "100.64.0.1",
      "::1",
      "fe80::1",
      "fd00::1",
      "::ffff:10.0.0.1",
    ]) {
      expect([ip, isPublicAddress(ip)]).toEqual([ip, false]);
    }
    for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1111", "::ffff:1.1.1.1"]) {
      expect([ip, isPublicAddress(ip)]).toEqual([ip, true]);
    }
    expect(isPublicAddress("not-an-ip")).toBe(false);
  });

  it("orders declared icons best first and always ends with /favicon.ico", () => {
    const html = `<html><head>
      <link rel="stylesheet" href="/a.css">
      <link rel="icon" href="/small.ico" sizes="16x16">
      <link rel='shortcut icon' href='/fav.png' sizes='64x64'>
      <link rel="apple-touch-icon" href="touch.png">
      <link rel="icon" href="/fav.png" sizes="64x64">
    </head></html>`;
    expect(iconCandidates(html, "https://app.example/login")).toEqual([
      "https://app.example/touch.png",
      "https://app.example/fav.png",
      "https://app.example/small.ico",
      "https://app.example/favicon.ico",
    ]);
    expect(iconCandidates("", "https://app.example/x")).toEqual([
      "https://app.example/favicon.ico",
    ]);
  });
});
