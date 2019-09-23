#pragma clang diagnostic ignored "-Wmissing-prototypes"

#include <metal_stdlib>
#include <simd/simd.h>

using namespace metal;

// Returns 2D texture coords corresponding to 1D texel buffer coords
static inline __attribute__((always_inline))
uint2 spvTexelBufferCoord(uint tc)
{
    return uint2(tc % 4096, tc / 4096);
}

template<typename T> struct spvRemoveReference { typedef T type; };
template<typename T> struct spvRemoveReference<thread T&> { typedef T type; };
template<typename T> struct spvRemoveReference<thread T&&> { typedef T type; };
template<typename T>
inline constexpr thread T&& spvForward(thread typename spvRemoveReference<T>::type& x)
{
    return static_cast<thread T&&>(x);
}
template<typename T>
inline constexpr thread T&& spvForward(thread typename spvRemoveReference<T>::type&& x)
{
    return static_cast<thread T&&>(x);
}

enum class spvSwizzle : uint
{
    none = 0,
    zero,
    one,
    red,
    green,
    blue,
    alpha
};

template<typename T>
inline T spvGetSwizzle(vec<T, 4> x, T c, spvSwizzle s)
{
    switch (s)
    {
        case spvSwizzle::none:
            return c;
        case spvSwizzle::zero:
            return 0;
        case spvSwizzle::one:
            return 1;
        case spvSwizzle::red:
            return x.r;
        case spvSwizzle::green:
            return x.g;
        case spvSwizzle::blue:
            return x.b;
        case spvSwizzle::alpha:
            return x.a;
    }
}

// Wrapper function that swizzles texture samples and fetches.
template<typename T>
inline vec<T, 4> spvTextureSwizzle(vec<T, 4> x, uint s)
{
    if (!s)
        return x;
    return vec<T, 4>(spvGetSwizzle(x, x.r, spvSwizzle((s >> 0) & 0xFF)), spvGetSwizzle(x, x.g, spvSwizzle((s >> 8) & 0xFF)), spvGetSwizzle(x, x.b, spvSwizzle((s >> 16) & 0xFF)), spvGetSwizzle(x, x.a, spvSwizzle((s >> 24) & 0xFF)));
}

template<typename T>
inline T spvTextureSwizzle(T x, uint s)
{
    return spvTextureSwizzle(vec<T, 4>(x, 0, 0, 1), s).x;
}

// Wrapper function that swizzles texture gathers.
template<typename T, template<typename, access = access::sample, typename = void> class Tex, typename... Ts>
inline vec<T, 4> spvGatherSwizzle(const thread Tex<T>& t, sampler s, uint sw, component c, Ts... params) METAL_CONST_ARG(c)
{
    if (sw)
    {
        switch (spvSwizzle((sw >> (uint(c) * 8)) & 0xFF))
        {
            case spvSwizzle::none:
                break;
            case spvSwizzle::zero:
                return vec<T, 4>(0, 0, 0, 0);
            case spvSwizzle::one:
                return vec<T, 4>(1, 1, 1, 1);
            case spvSwizzle::red:
                return t.gather(s, spvForward<Ts>(params)..., component::x);
            case spvSwizzle::green:
                return t.gather(s, spvForward<Ts>(params)..., component::y);
            case spvSwizzle::blue:
                return t.gather(s, spvForward<Ts>(params)..., component::z);
            case spvSwizzle::alpha:
                return t.gather(s, spvForward<Ts>(params)..., component::w);
        }
    }
    switch (c)
    {
        case component::x:
            return t.gather(s, spvForward<Ts>(params)..., component::x);
        case component::y:
            return t.gather(s, spvForward<Ts>(params)..., component::y);
        case component::z:
            return t.gather(s, spvForward<Ts>(params)..., component::z);
        case component::w:
            return t.gather(s, spvForward<Ts>(params)..., component::w);
    }
}

// Wrapper function that swizzles depth texture gathers.
template<typename T, template<typename, access = access::sample, typename = void> class Tex, typename... Ts>
inline vec<T, 4> spvGatherCompareSwizzle(const thread Tex<T>& t, sampler s, uint sw, Ts... params) 
{
    if (sw)
    {
        switch (spvSwizzle(sw & 0xFF))
        {
            case spvSwizzle::none:
            case spvSwizzle::red:
                break;
            case spvSwizzle::zero:
            case spvSwizzle::green:
            case spvSwizzle::blue:
            case spvSwizzle::alpha:
                return vec<T, 4>(0, 0, 0, 0);
            case spvSwizzle::one:
                return vec<T, 4>(1, 1, 1, 1);
        }
    }
    return t.gather_compare(s, spvForward<Ts>(params)...);
}

static inline __attribute__((always_inline))
float4 doSwizzle(thread texture1d<float> tex1d, thread const sampler tex1dSmplr, constant uint& tex1dSwzl, thread texture2d<float> tex2d, thread const sampler tex2dSmplr, constant uint& tex2dSwzl, thread texture3d<float> tex3d, thread const sampler tex3dSmplr, constant uint& tex3dSwzl, thread texturecube<float> texCube, thread const sampler texCubeSmplr, constant uint& texCubeSwzl, thread texture2d_array<float> tex2dArray, thread const sampler tex2dArraySmplr, constant uint& tex2dArraySwzl, thread texturecube_array<float> texCubeArray, thread const sampler texCubeArraySmplr, constant uint& texCubeArraySwzl, thread depth2d<float> depth2d, thread const sampler depth2dSmplr, constant uint& depth2dSwzl, thread depthcube<float> depthCube, thread const sampler depthCubeSmplr, constant uint& depthCubeSwzl, thread depth2d_array<float> depth2dArray, thread const sampler depth2dArraySmplr, constant uint& depth2dArraySwzl, thread depthcube_array<float> depthCubeArray, thread const sampler depthCubeArraySmplr, constant uint& depthCubeArraySwzl, thread texture2d<float> texBuffer)
{
    float4 c = tex1d.sample(tex1dSmplr, 0.0);
    c = tex2d.sample(tex2dSmplr, float2(0.0));
    c = tex3d.sample(tex3dSmplr, float3(0.0));
    c = texCube.sample(texCubeSmplr, float3(0.0));
    c = tex2dArray.sample(tex2dArraySmplr, float3(0.0).xy, uint(round(float3(0.0).z)));
    c = texCubeArray.sample(texCubeArraySmplr, float4(0.0).xyz, uint(round(float4(0.0).w)));
    c.x = depth2d.sample_compare(depth2dSmplr, float3(0.0, 0.0, 1.0).xy, float3(0.0, 0.0, 1.0).z);
    c.x = depthCube.sample_compare(depthCubeSmplr, float4(0.0, 0.0, 0.0, 1.0).xyz, float4(0.0, 0.0, 0.0, 1.0).w);
    c.x = depth2dArray.sample_compare(depth2dArraySmplr, float4(0.0, 0.0, 0.0, 1.0).xy, uint(round(float4(0.0, 0.0, 0.0, 1.0).z)), float4(0.0, 0.0, 0.0, 1.0).w);
    c.x = depthCubeArray.sample_compare(depthCubeArraySmplr, float4(0.0).xyz, uint(round(float4(0.0).w)), 1.0);
    c = tex1d.sample(tex1dSmplr, float2(0.0, 1.0).x / float2(0.0, 1.0).y);
    c = tex2d.sample(tex2dSmplr, float3(0.0, 0.0, 1.0).xy / float3(0.0, 0.0, 1.0).z);
    c = tex3d.sample(tex3dSmplr, float4(0.0, 0.0, 0.0, 1.0).xyz / float4(0.0, 0.0, 0.0, 1.0).w);
    float4 _103 = float4(0.0, 0.0, 1.0, 1.0);
    _103.z = float4(0.0, 0.0, 1.0, 1.0).w;
    c.x = depth2d.sample_compare(depth2dSmplr, _103.xy / _103.z, float4(0.0, 0.0, 1.0, 1.0).z / _103.z);
    c = tex1d.sample(tex1dSmplr, 0.0);
    c = tex2d.sample(tex2dSmplr, float2(0.0), level(0.0));
    c = tex3d.sample(tex3dSmplr, float3(0.0), level(0.0));
    c = texCube.sample(texCubeSmplr, float3(0.0), level(0.0));
    c = tex2dArray.sample(tex2dArraySmplr, float3(0.0).xy, uint(round(float3(0.0).z)), level(0.0));
    c = texCubeArray.sample(texCubeArraySmplr, float4(0.0).xyz, uint(round(float4(0.0).w)), level(0.0));
    c.x = depth2d.sample_compare(depth2dSmplr, float3(0.0, 0.0, 1.0).xy, float3(0.0, 0.0, 1.0).z, level(0.0));
    c = tex1d.sample(tex1dSmplr, float2(0.0, 1.0).x / float2(0.0, 1.0).y);
    c = tex2d.sample(tex2dSmplr, float3(0.0, 0.0, 1.0).xy / float3(0.0, 0.0, 1.0).z, level(0.0));
    c = tex3d.sample(tex3dSmplr, float4(0.0, 0.0, 0.0, 1.0).xyz / float4(0.0, 0.0, 0.0, 1.0).w, level(0.0));
    float4 _131 = float4(0.0, 0.0, 1.0, 1.0);
    _131.z = float4(0.0, 0.0, 1.0, 1.0).w;
    c.x = depth2d.sample_compare(depth2dSmplr, _131.xy / _131.z, float4(0.0, 0.0, 1.0, 1.0).z / _131.z, level(0.0));
    c = tex1d.read(uint(0));
    c = tex2d.read(uint2(int2(0)), 0);
    c = tex3d.read(uint3(int3(0)), 0);
    c = tex2dArray.read(uint2(int3(0).xy), uint(int3(0).z), 0);
    c = texBuffer.read(spvTexelBufferCoord(0));
    c = spvGatherSwizzle(tex2d, tex2dSmplr, tex2dSwzl, component::x, float2(0.0), int2(0));
    c = spvGatherSwizzle(texCube, texCubeSmplr, texCubeSwzl, component::y, float3(0.0));
    c = spvGatherSwizzle(tex2dArray, tex2dArraySmplr, tex2dArraySwzl, component::z, float3(0.0).xy, uint(round(float3(0.0).z)), int2(0));
    c = spvGatherSwizzle(texCubeArray, texCubeArraySmplr, texCubeArraySwzl, component::w, float4(0.0).xyz, uint(round(float4(0.0).w)));
    c = spvGatherCompareSwizzle(depth2d, depth2dSmplr, depth2dSwzl, float2(0.0), 1.0);
    c = spvGatherCompareSwizzle(depthCube, depthCubeSmplr, depthCubeSwzl, float3(0.0), 1.0);
    c = spvGatherCompareSwizzle(depth2dArray, depth2dArraySmplr, depth2dArraySwzl, float3(0.0).xy, uint(round(float3(0.0).z)), 1.0);
    c = spvGatherCompareSwizzle(depthCubeArray, depthCubeArraySmplr, depthCubeArraySwzl, float4(0.0).xyz, uint(round(float4(0.0).w)), 1.0);
    return c;
}

fragment void main0(constant uint* spvSwizzleConstants [[buffer(0)]], texture1d<float> tex1d [[texture(0)]], texture2d<float> tex2d [[texture(1)]], texture3d<float> tex3d [[texture(2)]], texturecube<float> texCube [[texture(3)]], texture2d_array<float> tex2dArray [[texture(4)]], texturecube_array<float> texCubeArray [[texture(5)]], depth2d<float> depth2d [[texture(6)]], depthcube<float> depthCube [[texture(7)]], depth2d_array<float> depth2dArray [[texture(8)]], depthcube_array<float> depthCubeArray [[texture(9)]], texture2d<float> texBuffer [[texture(10)]], sampler tex1dSmplr [[sampler(0)]], sampler tex2dSmplr [[sampler(1)]], sampler tex3dSmplr [[sampler(2)]], sampler texCubeSmplr [[sampler(3)]], sampler tex2dArraySmplr [[sampler(4)]], sampler texCubeArraySmplr [[sampler(5)]], sampler depth2dSmplr [[sampler(6)]], sampler depthCubeSmplr [[sampler(7)]], sampler depth2dArraySmplr [[sampler(8)]], sampler depthCubeArraySmplr [[sampler(9)]])
{
    constant uint& tex1dSwzl = spvSwizzleConstants[11];
    constant uint& tex2dSwzl = spvSwizzleConstants[12];
    constant uint& tex3dSwzl = spvSwizzleConstants[13];
    constant uint& texCubeSwzl = spvSwizzleConstants[14];
    constant uint& tex2dArraySwzl = spvSwizzleConstants[15];
    constant uint& texCubeArraySwzl = spvSwizzleConstants[16];
    constant uint& depth2dSwzl = spvSwizzleConstants[17];
    constant uint& depthCubeSwzl = spvSwizzleConstants[18];
    constant uint& depth2dArraySwzl = spvSwizzleConstants[19];
    constant uint& depthCubeArraySwzl = spvSwizzleConstants[20];
    float4 c = doSwizzle(tex1d, tex1dSmplr, tex1dSwzl, tex2d, tex2dSmplr, tex2dSwzl, tex3d, tex3dSmplr, tex3dSwzl, texCube, texCubeSmplr, texCubeSwzl, tex2dArray, tex2dArraySmplr, tex2dArraySwzl, texCubeArray, texCubeArraySmplr, texCubeArraySwzl, depth2d, depth2dSmplr, depth2dSwzl, depthCube, depthCubeSmplr, depthCubeSwzl, depth2dArray, depth2dArraySmplr, depth2dArraySwzl, depthCubeArray, depthCubeArraySmplr, depthCubeArraySwzl, texBuffer);
}

