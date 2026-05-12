import re

# 1. Update Order.cs
im_path = '/home/hermes/git_projects/dotnet-backend/Models/Order.cs'
with open(im_path, 'r') as f:
    content = f.read()

content = re.sub(
    r'public\s*long\?\s*SalespersonId\s*\{\s*get;\s*set;\s*\}',
    r'[MaxLength(20)]\n    public string? SalespersonEmployeeCode { get; set; }',
    content
)

content = re.sub(
    r'public\s*virtual\s*ApplicationUser\?\s*Salesperson\s*\{\s*get;\s*set;\s*\}',
    r'public virtual Employee? SalespersonEmployee { get; set; }',
    content
)

with open(im_path, 'w') as f:
    f.write(content)

# 2. Update ApplicationDbContext.cs
db_path = '/home/hermes/git_projects/dotnet-backend/Data/ApplicationDbContext.cs'
with open(db_path, 'r') as f:
    db_content = f.read()

mapping_code = """
        builder.Entity<Order>()
            .HasOne(o => o.SalespersonEmployee)
            .WithMany()
            .HasPrincipalKey(e => e.EmployeeNo)
            .HasForeignKey(o => o.SalespersonEmployeeCode)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
"""
if "builder.Entity<Order>()" not in db_content:
    db_content = db_content.replace(
        "// PartnerContact 配置",
        mapping_code + "\n        // PartnerContact 配置"
    )
    with open(db_path, 'w') as f:
        f.write(db_content)

# 3. Update OrderDto.cs
dto_path = '/home/hermes/git_projects/dotnet-backend/Models/DTOs/OrderDto.cs'
with open(dto_path, 'r') as f:
    dto_content = f.read()

dto_content = dto_content.replace(
    'public long? SalespersonId { get; set; }',
    'public string? SalespersonEmployeeCode { get; set; }'
)

with open(dto_path, 'w') as f:
    f.write(dto_content)

# 4. Update OrderService.cs
srv_path = '/home/hermes/git_projects/dotnet-backend/Services/OrderService.cs'
with open(srv_path, 'r') as f:
    srv_content = f.read()

srv_content = srv_content.replace(
    'SalespersonId = entity.SalespersonId',
    'SalespersonEmployeeCode = entity.SalespersonEmployeeCode'
)
srv_content = srv_content.replace(
    'SalespersonName = entity.Salesperson != null ? entity.Salesperson.Name : null',
    'SalespersonName = entity.SalespersonEmployee != null ? entity.SalespersonEmployee.Name : null'
)
srv_content = srv_content.replace(
    '.Include(x => x.Salesperson)',
    '.Include(x => x.SalespersonEmployee)'
)

with open(srv_path, 'w') as f:
    f.write(srv_content)

print("Backend Order updated")
